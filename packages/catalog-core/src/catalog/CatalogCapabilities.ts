export interface CatalogCapabilities {
  pagination: 'cursor' | 'page' | 'none';
  /** False when the provider gives no ratings at all; the rating filter is then not applied. */
  ratings: boolean;
  supportedGradeSystems: string[];
  deltaSync: boolean;
}
