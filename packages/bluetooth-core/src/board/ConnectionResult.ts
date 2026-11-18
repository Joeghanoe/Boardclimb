import type { BoardCapabilities } from './BoardCapabilities';
import type { BoardErrorCode } from './BoardErrorCode';

export type ConnectionResult =
  { ok: true; capabilities: BoardCapabilities } | { ok: false; code: BoardErrorCode; message: string };
