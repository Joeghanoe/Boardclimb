import { distanceKm } from '@boardclimb/domain';
import type { Gym } from '@boardclimb/domain';
import type { GymSource } from '../ports/GymSource';
import type { GymMatch } from './GymMatch';
import type { GymQuery } from './GymQuery';

interface IndexedGym {
  gym: Gym;
  /** Lower-case name, city and country without accents, for word search. */
  words: string;
}

/**
 * Finds gyms on the combined map: one list for all three manufacturers, filtered by board and words and
 * ordered by distance. Never touches the board or the log. Expected size about 2,500 gyms, bounded at
 * 25,000 (tested): one linear filter and one sort per query.
 */
export class GymFinder {
  private loaded: Promise<IndexedGym[]> | null = null;

  constructor(private readonly source: GymSource) {}

  async find(query: GymQuery): Promise<GymMatch[]> {
    const gyms = await this.load();
    const terms = normalise(query.text).split(/\s+/).filter(Boolean);
    const matches: GymMatch[] = [];
    for (const entry of gyms) {
      if (query.manufacturer && !entry.gym.boards.some((b) => b.manufacturer === query.manufacturer))
        continue;
      if (!terms.every((term) => entry.words.includes(term))) continue;
      matches.push({ gym: entry.gym, distanceKm: query.near ? distanceKm(query.near, entry.gym) : null });
    }
    matches.sort((a, b) =>
      a.distanceKm !== null && b.distanceKm !== null
        ? a.distanceKm - b.distanceKm
        : a.gym.name.localeCompare(b.gym.name),
    );
    return matches.slice(0, Math.max(0, query.limit));
  }

  private load(): Promise<IndexedGym[]> {
    this.loaded ??= this.source.listGyms().then(
      (gyms) => gyms.map((gym) => ({ gym, words: normalise([gym.name, gym.city, gym.country].join(' ')) })),
      (error: unknown) => {
        // A failed read is not remembered, so opening the map again retries.
        this.loaded = null;
        throw error;
      },
    );
    return this.loaded;
  }
}

function normalise(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
