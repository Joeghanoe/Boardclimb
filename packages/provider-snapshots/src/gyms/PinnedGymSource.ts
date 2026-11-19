import type { Gym } from '@boardclimb/domain';

interface PinnedGyms {
  source: string;
  takenAt: string;
  gyms: Gym[];
}

/**
 * The combined gym list pinned in `data/gyms.json` by `scripts/pin-gyms.ts`. Bundled, so the map works offline
 * and the app calls no gym endpoint. Loaded on first use so it costs nothing until the map is opened.
 */
export class PinnedGymSource {
  private gyms: Promise<readonly Gym[]> | null = null;

  constructor(private readonly read: () => Promise<PinnedGyms> = readPinned) {}

  listGyms(): Promise<readonly Gym[]> {
    this.gyms ??= this.read().then((pinned) => pinned.gyms);
    return this.gyms;
  }
}

async function readPinned(): Promise<PinnedGyms> {
  const module = await import('../../data/gyms.json');
  return (module.default ?? module) as PinnedGyms;
}
