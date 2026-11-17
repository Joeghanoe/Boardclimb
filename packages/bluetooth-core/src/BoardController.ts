import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import type { BoardCapabilities } from './BoardCapabilities';
import type { ConnectionResult } from './ConnectionResult';
import type { DiscoveredBoard } from './DiscoveredBoard';
import type { LightCommandResult } from './LightCommandResult';

/**
 * One manufacturer's physical controller (ADR-0002 section 2.4). Only `lightUp` may change LEDs; discover,
 * connect, reconnect and disconnect never do. `discover` rejects with BoardError; the rest return results.
 */
export interface BoardController {
  readonly manufacturer: Manufacturer;
  discover(): Promise<DiscoveredBoard[]>;
  connect(target: DiscoveredBoard, configuration: BoardConfiguration): Promise<ConnectionResult>;
  /** Reconnects to the last connected board. Sends no LED command, ever (FR-017). */
  reconnect(): Promise<ConnectionResult>;
  getCapabilities(): BoardCapabilities;
  lightUp(problem: Problem): Promise<LightCommandResult>;
  disconnect(): Promise<void>;
  /** Called when the link drops without the user asking. Returns an unsubscribe function. */
  onConnectionLost(listener: () => void): () => void;
}
