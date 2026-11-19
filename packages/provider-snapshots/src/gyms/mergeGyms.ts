import { distanceKm } from '@boardclimb/domain';
import type { Gym } from '@boardclimb/domain';

/** Listings this close are the same building whatever their names. */
const SAME_PLACE_KM = 0.04;
/** Listings this close are the same gym when their names share a distinctive word. */
const NEARBY_KM = 0.25;
/** Grid cell in degrees; NEARBY_KM always fits within one cell, so only neighbouring cells are searched. */
const CELL = 0.01;
/** Words that say "climbing gym" in some language and so do not tell two gyms apart. */
const GENERIC = new Set([
  'boulder',
  'bouldering',
  'boulderhal',
  'boulderhalle',
  'bloc',
  'block',
  'climbing',
  'climb',
  'gym',
  'center',
  'centre',
  'club',
  'kletterhalle',
  'kletterzentrum',
  'klimhal',
  'klatring',
  'escalade',
  'escalada',
  'arrampicata',
  'wall',
  'walls',
  'rock',
  'the',
  'and',
  'board',
  'kilter',
  'tension',
  'moonboard',
]);

/**
 * One gym per place across the manufacturers' listings. A listing joins an earlier gym only when that gym does
 * not already have its manufacturer, so two listings from one manufacturer are never folded together. The first
 * listing's name, city and country win; missing city or country are filled from later ones.
 * Expected about 2,500 listings, bounded at 25,000: a grid keeps the work linear.
 */
export function mergeGyms(listings: readonly Gym[]): Gym[] {
  const merged: Gym[] = [];
  const grid = new Map<string, number[]>();
  for (const listing of listings) {
    const index = findMatch(listing, merged, grid);
    if (index === null) {
      merged.push({ ...listing, boards: [...listing.boards] });
      const key = cellKey(cellOf(listing.latitude), cellOf(listing.longitude));
      grid.set(key, [...(grid.get(key) ?? []), merged.length - 1]);
      continue;
    }
    const gym = merged[index] as Gym;
    merged[index] = {
      ...gym,
      city: gym.city ?? listing.city,
      country: gym.country ?? listing.country,
      boards: [...gym.boards, ...listing.boards],
    };
  }
  return merged;
}

function findMatch(listing: Gym, merged: readonly Gym[], grid: Map<string, number[]>): number | null {
  const manufacturers = new Set(listing.boards.map((board) => board.manufacturer));
  const words = distinctiveWords(listing.name);
  let best: { index: number; km: number } | null = null;
  const row = cellOf(listing.latitude);
  const column = cellOf(listing.longitude);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      for (const index of grid.get(cellKey(row + dr, column + dc)) ?? []) {
        const gym = merged[index] as Gym;
        if (gym.boards.some((board) => manufacturers.has(board.manufacturer))) continue;
        const km = distanceKm(listing, gym);
        const sameGym =
          km <= SAME_PLACE_KM ||
          (km <= NEARBY_KM && distinctiveWords(gym.name).some((w) => words.includes(w)));
        if (sameGym && (!best || km < best.km)) best = { index, km };
      }
    }
  }
  return best?.index ?? null;
}

function distinctiveWords(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !GENERIC.has(word));
}

function cellOf(degrees: number): number {
  return Math.floor(degrees / CELL);
}

function cellKey(row: number, column: number): string {
  return `${row}:${column}`;
}
