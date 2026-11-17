export const CATALOG_ERROR_CODES = [
  'provider_unverified',
  'network_unavailable',
  'provider_rejected',
  'schema_mismatch',
  'not_found',
] as const;

export type CatalogErrorCode = (typeof CATALOG_ERROR_CODES)[number];
