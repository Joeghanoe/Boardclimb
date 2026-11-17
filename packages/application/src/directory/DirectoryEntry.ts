import type { CatalogErrorCode } from '@boardclimb/catalog-core';
import type { Manufacturer } from '@boardclimb/domain';
import type { BoardWithConfigurations } from './BoardWithConfigurations';

/** One manufacturer's boards, or why they could not be listed. One failing provider never hides the others. */
export type DirectoryEntry =
  | { manufacturer: Manufacturer; ok: true; boards: BoardWithConfigurations[] }
  | { manufacturer: Manufacturer; ok: false; code: CatalogErrorCode };
