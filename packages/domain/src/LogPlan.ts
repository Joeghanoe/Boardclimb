import type { LogErrorCode } from './LogErrorCode';
import type { LogEvent } from './LogEvent';

/** The outcome of a log rule: events to append (possibly none, when the request changes nothing) or a refusal. */
export type LogPlan = { ok: true; events: LogEvent[] } | { ok: false; code: LogErrorCode; message: string };
