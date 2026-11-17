import type { CatalogErrorCode } from '@boardclimb/catalog-core';

export type RefreshResult =
  { ok: true; fetched: number; skipped: number } | { ok: false; code: CatalogErrorCode };
