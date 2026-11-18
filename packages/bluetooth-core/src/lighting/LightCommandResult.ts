import type { BoardErrorCode } from '../board/BoardErrorCode';

/** `sent` is not `confirmed`: confirmed only when the controller reports LED state back (FR-009, acceptance 12). */
export type LightCommandResult =
  { ok: true; confirmed: boolean } | { ok: false; code: BoardErrorCode; message: string };
