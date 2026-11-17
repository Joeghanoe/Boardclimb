import { BoardError } from '@boardclimb/bluetooth-core';
import type {
  BoardController,
  ConnectionResult,
  DiscoveredBoard,
  LightCommandResult,
} from '@boardclimb/bluetooth-core';
import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import type { Clock } from '../ports/Clock';
import type { DiagnosticsSink } from '../ports/DiagnosticsSink';
import type { BoardSessionSnapshot } from './BoardSessionSnapshot';
import type { ConnectionState } from './ConnectionState';
import type { ControllerLookup } from './ControllerLookup';
import type { DiscoveryResult } from './DiscoveryResult';

const IDLE: BoardSessionSnapshot = {
  connection: 'idle',
  board: null,
  configuration: null,
  capabilities: null,
  error: null,
  command: { state: 'idle' },
};

/**
 * This phone's view of one board: connection, last lighting command and honest status (FR-009, FR-017).
 * Only `lightUp` sends an LED command. Discover, connect, reconnect and resume never do, and a dropped link
 * is never silently repaired with a command.
 */
export class BoardSession {
  private state: BoardSessionSnapshot = IDLE;
  private active: BoardController | null = null;
  private connectionEpoch = 0;
  private connecting: Promise<void> = Promise.resolve();
  private stopListening: (() => void) | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly controllers: ControllerLookup,
    private readonly clock: Clock,
    private readonly diagnostics: DiagnosticsSink,
  ) {}

  snapshot(): BoardSessionSnapshot {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async discover(manufacturer: Manufacturer): Promise<DiscoveryResult> {
    try {
      const boards = await this.controllers(manufacturer).discover();
      this.diagnostics.emit({ name: 'board.discovered', manufacturer, count: boards.length });
      return { ok: true, boards };
    } catch (error) {
      if (error instanceof BoardError) return { ok: false, code: error.code, message: error.message };
      return { ok: false, code: 'scan_failed', message: 'Scanning for boards failed.' };
    }
  }

  connect(target: DiscoveredBoard, configuration: BoardConfiguration): Promise<ConnectionResult> {
    const epoch = ++this.connectionEpoch;
    // Invalidate the previous controller immediately, even if its native connect is still pending.
    const previous = this.active;
    this.stopListening?.();
    this.stopListening = null;
    this.active = null;
    const stopped = previous?.disconnect() ?? Promise.resolve();
    this.update({
      board: target,
      configuration,
      connection: 'connecting',
      error: null,
      command: { state: 'idle' },
    });
    const work = this.connecting.then(async () => {
      await stopped;
      if (epoch !== this.connectionEpoch)
        return { ok: false, code: 'not_connected', message: 'The selected board changed.' } as const;
      const controller = this.controllers(target.manufacturer);
      this.attach(controller);
      return this.open(controller, () => controller.connect(target, configuration), epoch);
    });
    this.connecting = work.then(
      () => undefined,
      () => undefined,
    );
    return work;
  }

  /** Reconnects only the last explicit selection; never resends LEDs. */
  reconnect(): Promise<ConnectionResult> {
    const controller = this.active;
    if (!controller)
      return Promise.resolve({
        ok: false,
        code: 'not_connected',
        message: 'There is no board to reconnect to.',
      });
    const epoch = this.connectionEpoch;
    const work = this.connecting.then(() => {
      if (epoch !== this.connectionEpoch)
        return { ok: false, code: 'not_connected', message: 'The selected board changed.' } as const;
      return this.open(controller, () => controller.reconnect(), epoch);
    });
    this.connecting = work.then(
      () => undefined,
      () => undefined,
    );
    return work;
  }

  /** App returned to the foreground: reconnect if the link dropped. Never relights a previous problem. */
  async resume(): Promise<void> {
    if (this.state.connection === 'lost') await this.reconnect();
  }

  async lightUp(problem: Problem): Promise<LightCommandResult> {
    const controller = this.active;
    if (!controller) {
      const failure = { ok: false, code: 'not_connected', message: 'Connect to a board first.' } as const;
      this.update({
        command: { state: 'failed', problemKey: problem.key, code: failure.code, message: failure.message },
      });
      return failure;
    }
    this.update({ command: { state: 'pending', problemKey: problem.key } });
    const started = this.clock.now().getTime();
    const epoch = this.connectionEpoch;
    const result = await controller.lightUp(problem);
    if (epoch !== this.connectionEpoch)
      return { ok: false, code: 'not_connected', message: 'The selected board changed. Tap Light up again.' };
    const at = this.clock.now().toISOString();
    this.diagnostics.emit({
      name: 'board.command_result',
      manufacturer: controller.manufacturer,
      ok: result.ok,
      code: result.ok ? null : result.code,
      ms: this.clock.now().getTime() - started,
    });
    this.update({
      command: result.ok
        ? { state: result.confirmed ? 'confirmed' : 'sent', problemKey: problem.key, at }
        : { state: 'failed', problemKey: problem.key, code: result.code, message: result.message },
    });
    return result;
  }

  async disconnect(): Promise<void> {
    const epoch = ++this.connectionEpoch;
    const controller = this.active;
    this.stopListening?.();
    this.stopListening = null;
    this.active = null;
    if (controller) await controller.disconnect();
    if (epoch === this.connectionEpoch)
      this.update({
        ...IDLE,
        command: this.state.command.state === 'pending' ? { state: 'idle' } : this.state.command,
      });
  }

  private attach(controller: BoardController): void {
    if (this.active === controller) return;
    this.stopListening?.();
    this.active = controller;
    this.stopListening = controller.onConnectionLost(() => this.transition('lost', null));
  }

  private async open(
    controller: BoardController,
    attempt: () => Promise<ConnectionResult>,
    epoch: number,
  ): Promise<ConnectionResult> {
    this.transition('connecting', null, controller.manufacturer);
    const started = this.clock.now().getTime();
    const result = await attempt();
    if (epoch !== this.connectionEpoch)
      return { ok: false, code: 'not_connected', message: 'The selected board changed.' };
    if (result.ok) {
      this.update({ capabilities: result.capabilities });
      this.transition('connected', null, controller.manufacturer, started);
    } else {
      this.transition(
        'failed',
        { code: result.code, message: result.message },
        controller.manufacturer,
        started,
      );
    }
    return result;
  }

  private transition(
    to: ConnectionState,
    error: BoardSessionSnapshot['error'],
    manufacturer: Manufacturer | undefined = this.active?.manufacturer,
    started?: number,
  ): void {
    const from = this.state.connection;
    this.update({ connection: to, error });
    if (manufacturer) {
      this.diagnostics.emit({
        name: 'board.connection_changed',
        manufacturer,
        from,
        to,
        code: error?.code ?? null,
        ms: started === undefined ? 0 : this.clock.now().getTime() - started,
      });
    }
  }

  private update(change: Partial<BoardSessionSnapshot>): void {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
}
