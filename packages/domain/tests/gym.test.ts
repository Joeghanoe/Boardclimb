import { describe, expect, it } from 'bun:test';
import { distanceKm, gymManufacturers } from '@boardclimb/domain';
import type { Gym } from '@boardclimb/domain';

describe('gym map: distance and boards', () => {
  it('measures great-circle distance in kilometres', () => {
    const utrecht = { latitude: 52.0907, longitude: 5.1214 };
    const amsterdam = { latitude: 52.3676, longitude: 4.9041 };
    expect(distanceKm(utrecht, utrecht)).toBe(0);
    expect(distanceKm(utrecht, amsterdam)).toBeCloseTo(34.1, 0);
    expect(distanceKm(amsterdam, utrecht)).toBeCloseTo(distanceKm(utrecht, amsterdam), 9);
  });

  it('lists each manufacturer once, in the app’s fixed order', () => {
    const board = { name: null, boardName: null, angleDegrees: null, adjustable: null, lights: null };
    const gym: Gym = {
      id: 'g',
      name: 'G',
      city: null,
      country: null,
      latitude: 0,
      longitude: 1,
      boards: [
        { ...board, manufacturer: 'tension' },
        { ...board, manufacturer: 'kilter' },
        { ...board, manufacturer: 'kilter' },
      ],
    };
    expect(gymManufacturers(gym)).toEqual(['kilter', 'tension']);
  });
});
