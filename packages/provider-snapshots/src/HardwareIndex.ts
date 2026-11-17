import type { BoardConfiguration } from '@boardclimb/domain';
import type hardware from '../data/hardware.json';

type Row<K extends keyof typeof hardware> = (typeof hardware)[K][number];

/** One manufacturer's pinned hardware metadata, keyed for the lookups made per page and per hold. */
export interface HardwareIndex {
  configurationsByBoard: ReadonlyMap<string, readonly BoardConfiguration[]>;
  configurationIds: ReadonlySet<string>;
  sizes: ReadonlyMap<number, Row<'sizes'>>;
  gradesByDifficulty: ReadonlyMap<number, Row<'grades'>>;
  roles: ReadonlyMap<number, Row<'roles'>>;
  /** Placements of one layout and size, in file order, and the same placements by id. */
  placements(
    layout: number,
    size: number,
  ): { all: readonly Row<'placements'>[]; byId: ReadonlyMap<number, Row<'placements'>> };
}
