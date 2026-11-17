import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import type { BleTransport } from './BleTransport';
import type { BoardCapabilities } from './BoardCapabilities';
import type { BoardController } from './BoardController';
import { BoardError } from './BoardError';
import type { BoardErrorCode } from './BoardErrorCode';
import type { ConnectionResult } from './ConnectionResult';
import type { DeviceMatcher } from './DeviceMatcher';
import type { DiscoveredBoard } from './DiscoveredBoard';
import type { LedEncoder } from './LedEncoder';
import type { LightCommandResult } from './LightCommandResult';
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
    return this.open({ target, configuration });
  }

  reconnect(): Promise<ConnectionResult> {
    const previous = this.lastLink;
    if (!previous) {
      return Promise.resolve(this.failed('not_connected', 'There is no board to reconnect to.'));
    }
    return this.open(previous);
  }

  private lastLink: Link | null = null;

  private async open(link: Link): Promise<ConnectionResult> {
    const { transport } = this.options;
    if ((await transport.requestPermission()) === 'denied') {
      return this.failed('bluetooth_permission_denied', 'Bluetooth permission is needed to connect.');
    }
    if ((await transport.radioState()) === 'off') {
      return this.failed('bluetooth_disabled', 'Bluetooth is turned off.');
    }
    let result: TransportConnectResult;
    try {
      result = await transport.connect(link.target.id);
    } catch {
      result = { ok: false, reason: 'failed' };
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

  async lightUp(problem: Problem): Promise<LightCommandResult> {
    const link = this.link;
    if (!link) return this.failed('not_connected', 'Connect to a board first.');
    if (problem.manufacturer !== this.manufacturer || problem.configurationId !== link.configuration.id) {
      return this.failed('unsupported_configuration', 'This problem is for a different board layout.');
    }
    const frames = this.options.encoder.encode(problem, link.configuration);
    if (!frames) {
      return this.failed(
        'protocol_unverified',
        `Lighting ${this.manufacturer} boards has not been verified yet.`,
      );
    }
    for (const frame of frames) {
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
