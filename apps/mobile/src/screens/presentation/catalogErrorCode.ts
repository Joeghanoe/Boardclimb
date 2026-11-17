import { CATALOG_ERROR_CODES } from '@boardclimb/application';
import type { CatalogErrorCode } from '@boardclimb/application';

/** The catalog code carried by a thrown catalog error; anything else reads as a rejected provider. */
export function catalogErrorCode(error: unknown): CatalogErrorCode {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return CATALOG_ERROR_CODES.find((known) => known === code) ?? 'provider_rejected';
}
