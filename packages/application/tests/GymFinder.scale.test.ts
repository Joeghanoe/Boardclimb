import { describe, expect, it } from 'bun:test';
import { GymFinder, InMemoryGymSource } from '@boardclimb/application';
import type { Gym } from '@boardclimb/domain';

describe('gym map at ten times the expected size (CODE.9)', () => {
  it('answers a map query over 25,000 gyms within a frame budget', async () => {
    const board = { name: null, boardName: null, angleDegrees: null, adjustable: null, lights: true };
    const many: Gym[] = Array.from({ length: 25_000 }, (_, i) => ({
      id: String(i),
      name: `Gym ${i}`,
      city: null,
      country: null,
      latitude: -60 + (i % 120),
      longitude: -170 + ((i * 7) % 340),
      boards: [{ ...board, manufacturer: i % 2 ? 'kilter' : 'tension' }],
    }));
    const finder = new GymFinder(new InMemoryGymSource(many));
    const all = { near: null, manufacturer: null, text: '', limit: 10 };
    await finder.find(all);
    const started = performance.now();
    const found = await finder.find({
      near: { latitude: 52, longitude: 5 },
      manufacturer: 'kilter',
      text: '',
      limit: 150,
    });
    expect(performance.now() - started).toBeLessThan(150);
    expect(found).toHaveLength(150);
  });
});
