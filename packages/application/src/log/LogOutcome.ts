import type { LogErrorCode, LogSummary } from '@boardclimb/domain';

/** `summary` is re-read from storage after a write, so a success never shows an unsaved total. */
export type LogOutcome =
  { ok: true; summary: LogSummary } | { ok: false; code: LogErrorCode; message: string };
