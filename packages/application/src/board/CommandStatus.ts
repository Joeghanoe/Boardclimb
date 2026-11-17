import type { BoardErrorCode } from '@boardclimb/bluetooth-core';
import type { ProblemKey } from '@boardclimb/domain';

/**
 * What this phone knows about its lighting command (FR-009, acceptance 12). `sent` means the command left this
 * phone, not that the LEDs changed; only `confirmed` (controller readback) says the board reported it.
 */
export type CommandStatus =
  | { state: 'idle' }
  | { state: 'pending'; problemKey: ProblemKey }
  | { state: 'sent'; problemKey: ProblemKey; at: string }
  | { state: 'confirmed'; problemKey: ProblemKey; at: string }
  | { state: 'failed'; problemKey: ProblemKey; code: BoardErrorCode; message: string };
