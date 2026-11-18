import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import type { BleTransport } from '../bluetooth/BleTransport';
import type { BoardCapabilities } from './BoardCapabilities';
import type { BoardController } from './BoardController';
import { BoardError } from './BoardError';
import type { BoardErrorCode } from './BoardErrorCode';
import type { ConnectionResult } from './ConnectionResult';
import type { DeviceMatcher } from '../device/DeviceMatcher';
import type { DiscoveredBoard } from './DiscoveredBoard';
import type { LedEncoder } from '../lighting/LedEncoder';
import type { LightCommandResult } from '../lighting/LightCommandResult';
import type { TransportConnectResult } from './TransportConnectResult';

export interface TransportBoardControllerOptions {
  manufacturer: Manufacturer;
  transport: BleTransport;
  matcher: DeviceMatcher;
  encoder: LedEncoder;
  capabilities: BoardCapabilities;
}

interface Link {
  target: DiscoveredBoard;
  configuration: BoardConfiguration;
}

/**
 * The BoardController every manufacturer package is built from. It owns the rules that must hold for all
 * boards: scanning never connects, connecting and reconnecting never write, and only lightUp writes. The
 * vendor-specific parts (recognising a controller, encoding LEDs) arrive as a matcher and an encoder.
 */
export class TransportBoardController implements BoardController {
  readonly manufacturer: Manufacturer;
  private link: Link | null = null;
  private connectionEpoch = 0;
  private connecting: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: TransportBoardControllerOptions) {
    this.manufacturer = options.manufacturer;
    options.transport.onDisconnected((deviceId) => {
      if (this.link?.target.id !== deviceId) return;
      this.link = null;
      for (const listener of this.listeners) listener();
    });
  }

  getCapabilities(): BoardCapabilities {
    return this.options.capabilities;
  }

  async discover(): Promise<DiscoveredBoard[]> {
    const { transport, matcher } = this.options;
    if ((await transport.requestPermission()) === 'denied') {
      throw new BoardError(
        'bluetooth_permission_denied',
        'Bluetooth permission is needed to look for boards.',
      );
    }
    if ((await transport.radioState()) === 'off') {
      throw new BoardError('bluetooth_disabled', 'Bluetooth is turned off.');
    }
    let devices;
    try {
      devices = await transport.scan();
    } catch {
      throw new BoardError('scan_failed', 'Scanning for boards failed.');
    }
    const boards: DiscoveredBoard[] = [];
    for (const device of devices) {
      const match = matcher(device);
      if (match) {
        boards.push({
          id: device.id,
          name: device.name,
          manufacturer: this.manufacturer,
          detectedConfigurationId: match.configurationId,
        });
      }
    }
    return boards;
  }

  async connect(target: DiscoveredBoard, configuration: BoardConfiguration): Promise<ConnectionResult> {
    if (configuration.manufacturer !== this.manufacturer || target.manufacturer !== this.manufacturer) {
      return this.failed('unsupported_configuration', 'That configuration belongs to a different board.');
    }
    return this.enqueueConnection({ target, configuration });
  }

  reconnect(): Promise<ConnectionResult> {
    if (!this.lastLink)
      return Promise.resolve(this.failed('not_connected', 'There is no board to reconnect to.'));
    return this.enqueueConnection(this.lastLink);
  }

  private enqueueConnection(link: Link): Promise<ConnectionResult> {
    const epoch = ++this.connectionEpoch;
    const work = this.connecting.then(async () => {
      if (epoch !== this.connectionEpoch) return this.failed('not_connected', 'The selected board changed.');
      const old = this.link;
      this.link = null;
      if (old) await this.options.transport.disconnect(old.target.id);
      return this.open(link, epoch);
    });
    this.connecting = work.then(
      () => undefined,
      () => undefined,
    );
    return work;
  }

  private lastLink: Link | null = null;

  private async open(link: Link, epoch: number): Promise<ConnectionResult> {
    const { transport } = this.options;
    if ((await transport.requestPermission()) === 'denied') {
      return this.failed('bluetooth_permission_denied', 'Bluetooth permission is needed to connect.');
    }
    if ((await transport.radioState()) === 'off') {
      return this.failed('bluetooth_disabled', 'Bluetooth is turned off.');
    }
    let result: TransportConnectResult;
    try {
      if (epoch !== this.connectionEpoch) return this.failed('not_connected', 'The selected board changed.');
      result = await transport.connect(link.target.id);
    } catch {
      result = { ok: false, reason: 'failed' };
    }
    if (epoch !== this.connectionEpoch) {
      if (result.ok) await transport.disconnect(link.target.id);
      return this.failed('not_connected', 'The selected board changed.');
    }
    if (!result.ok) return this.failedConnect(result.reason);
    this.link = link;
    this.lastLink = link;
    return { ok: true, capabilities: this.options.capabilities };
  }

  private failedConnect(reason: 'timeout' | 'busy' | 'failed'): ConnectionResult {
    if (reason === 'timeout') return this.failed('connection_timeout', 'The board did not answer in time.');
    if (reason === 'busy') {
      return this.failed(
        'takeover_unsupported',
        'The board is connected to another phone and does not allow a second connection.',
      );
    }
    return this.failed('connection_failed', 'Could not connect to the board.');
  }

  private commands: Promise<void> = Promise.resolve();

  lightUp(problem: Problem): Promise<LightCommandResult> {
    const requested = this.link;
    const result = this.commands.then(() => this.send(problem, requested));
    this.commands = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async send(problem: Problem, requested: Link | null): Promise<LightCommandResult> {
    const link = this.link;
    if (link !== requested)
      return this.failed('not_connected', 'The selected board changed. Tap Light up again.');
    if (!link) return this.failed('not_connected', 'Connect to a board first.');
    if (problem.manufacturer !== this.manufacturer || problem.configurationId !== link.configuration.id) {
      return this.failed('unsupported_configuration', 'This problem is for a different board layout.');
    }
    const frames = this.options.encoder.encode(problem, link.configuration, link.target.name);
    if (!frames || frames.length === 0 || frames.some((frame) => frame.length === 0)) {
      return this.failed(
        'protocol_unverified',
        `Lighting ${this.manufacturer} boards has not been verified yet.`,
      );
    }
    for (const frame of frames) {
      if (this.link !== link)
        return this.failed('not_connected', 'The board disconnected. Tap Light up after reconnecting.');
      if (!(await this.write(link.target.id, frame))) {
        return this.failed('command_rejected', 'The board did not accept the command.');
      }
    }
    return { ok: true, confirmed: false };
  }

  private async write(deviceId: string, frame: Uint8Array): Promise<boolean> {
    try {
      return await this.options.transport.write(deviceId, frame);
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connectionEpoch += 1;
    const link = this.link;
    this.link = null;
    this.lastLink = null;
    if (link) await this.options.transport.disconnect(link.target.id);
  }

  onConnectionLost(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private failed(
    code: BoardErrorCode,
    message: string,
  ): { ok: false; code: BoardErrorCode; message: string } {
    return { ok: false, code, message };
  }
}
