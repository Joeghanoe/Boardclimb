export const STORAGE_ERROR_CODES = ['storage_corrupt', 'schema_too_new'] as const;

export type StorageErrorCode = (typeof STORAGE_ERROR_CODES)[number];

/** A stored value that cannot be trusted, or a database from a newer app. Never skipped silently. */
export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
