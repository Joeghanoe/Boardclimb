import type { BoardCatalog } from '@boardclimb/catalog-core';
import type { Manufacturer } from '@boardclimb/domain';

/** Finds the catalog for a manufacturer. Built once in the composition root (CODE.8). */
export type CatalogLookup = (manufacturer: Manufacturer) => BoardCatalog;
