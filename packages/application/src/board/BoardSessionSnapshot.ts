import type { BoardCapabilities, BoardErrorCode, DiscoveredBoard } from '@boardclimb/bluetooth-core';
import type { BoardConfiguration } from '@boardclimb/domain';
import type { CommandStatus } from './CommandStatus';
import type { ConnectionState } from './ConnectionState';

export interface BoardSessionSnapshot {
  connection: ConnectionState;
  board: DiscoveredBoard | null;
  configuration: BoardConfiguration | null;
  capabilities: BoardCapabilities | null;
  error: { code: BoardErrorCode; message: string } | null;
  command: CommandStatus;
}
