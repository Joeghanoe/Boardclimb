import type { ProviderHoldRecord } from '@boardclimb/catalog-core';
import pinned from '../../data/tension-mirrors.json';

interface PlacementPoint {
  x: number;
  y: number;
  position: number;
}

const MIRRORS: Readonly<Record<string, number>> = pinned.mirrors;

/**
 * A Tension problem flipped left to right: each hold moves to its pinned mirror placement on the same board,
 * keeping its role and colour. Undefined when any hold has no mirror on this layout and size; nothing is guessed.
 */
export function mirrorHolds(
  holds: readonly ProviderHoldRecord[],
  placements: ReadonlyMap<number, PlacementPoint>,
): ProviderHoldRecord[] | undefined {
  const mirrored: ProviderHoldRecord[] = [];
  for (const hold of holds) {
    const target = MIRRORS[hold.holdId];
    const point = target === undefined ? undefined : placements.get(target);
    if (target === undefined || !point) return undefined;
    mirrored.push({
      ...hold,
      holdId: String(target),
      x: point.x,
      y: point.y,
      ledPosition: point.position,
    });
  }
  return mirrored;
}
