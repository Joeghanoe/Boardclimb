import type { BlockName } from '@boardclimb/design-system';
import type { Manufacturer } from '@boardclimb/domain';

/** The colour field a manufacturer's board is shown on: one fixed pair each, so a climber learns them. */
export function manufacturerBlocks(manufacturer: Manufacturer | null): { from: BlockName; to: BlockName } {
  switch (manufacturer) {
    case 'kilter':
      return { from: 'yellow', to: 'coral' };
    case 'moonboard':
      return { from: 'sky', to: 'violet' };
    case 'tension':
      return { from: 'mint', to: 'sky' };
    case null:
      return { from: 'stone', to: 'yellow' };
  }
}
