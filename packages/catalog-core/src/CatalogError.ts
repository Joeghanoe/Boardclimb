import type { CatalogErrorCode } from './CatalogErrorCode';

/** A catalog failure with a stable code. Messages are safe to show; they never carry provider payloads. */
export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}
