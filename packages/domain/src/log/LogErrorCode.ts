export const LOG_ERROR_CODES = [
  'attempts_would_be_negative',
  'invalid_attempt_delta',
  'flash_conflicts_with_failed_attempts',
  'storage_failed',
  'storage_corrupt',
] as const;

export type LogErrorCode = (typeof LOG_ERROR_CODES)[number];
