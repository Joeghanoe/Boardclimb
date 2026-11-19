import type { Gym } from '@boardclimb/domain';

/** "Utrecht, NL"; null when the listing gives neither. */
export function describeGymPlace(gym: Gym): string | null {
  const parts = [gym.city, gym.country].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : null;
}
