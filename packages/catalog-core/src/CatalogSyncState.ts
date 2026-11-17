/** Where a configuration's incremental fetch stands (ADR-0003 `catalog_sync_state`). */
export interface CatalogSyncState {
  configKey: string;
  lastSuccessAt: string | null;
  /** Provider cursor of the next page to fetch; null with `exhausted` false means "not started". */
  nextCursor: string | null;
  /** True once the provider said it has nothing more. A cutoff never sets this. */
  exhausted: boolean;
  revisionToken: string | null;
}
