import type { LogErrorCode } from '@boardclimb/domain';
import type { Guidance } from './Guidance';

/** Exhaustive over the log codes: adding a code without wording fails type-checking. */
const WORDING: Record<LogErrorCode, Guidance> = {
  attempts_would_be_negative: {
    title: 'Attempts cannot go below zero',
    action: 'Nothing was changed.',
  },
  invalid_attempt_delta: {
    title: 'That is not a valid change',
    action: 'Nothing was changed. Try again.',
  },
  flash_conflicts_with_failed_attempts: {
    title: 'This problem already has failed attempts',
    action: 'A flash means first try. Mark it as a flash anyway, or keep it as a top.',
  },
  storage_failed: {
    title: 'Your change was not saved',
    action: 'Nothing was recorded. Try again.',
  },
  storage_corrupt: {
    title: 'Your saved history could not be read',
    action: 'Nothing was changed. Restart the app; if this stays, back up your phone before reinstalling.',
  },
};

export function describeLogError(code: LogErrorCode): Guidance {
  return WORDING[code];
}
