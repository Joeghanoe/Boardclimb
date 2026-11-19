import type { Gym } from '@boardclimb/domain';
import type { GymSource } from '../ports/GymSource';

/** A fixed gym list, for tests and the browser preview's sample mode. */
export class InMemoryGymSource implements GymSource {
  constructor(private readonly gyms: readonly Gym[]) {}

  listGyms(): Promise<readonly Gym[]> {
    return Promise.resolve(this.gyms);
  }
}
