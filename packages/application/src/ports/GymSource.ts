import type { Gym } from '@boardclimb/domain';

/** Every gym the app knows, merged across manufacturers. Read once; the list is a few thousand entries. */
export interface GymSource {
  listGyms(): Promise<readonly Gym[]>;
}
