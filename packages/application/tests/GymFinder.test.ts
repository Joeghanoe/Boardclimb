import { describe, expect, it } from 'bun:test';
import { GymFinder, InMemoryGymSource } from '@boardclimb/application';
import type { GymSource } from '@boardclimb/application';
import type { Gym, GymBoard, Manufacturer } from '@boardclimb/domain';

function board(manufacturer: Manufacturer): GymBoard {
  return { manufacturer, name: null, boardName: null, angleDegrees: null, adjustable: null, lights: true };
}

function gym(id: string, name: string, latitude: number, longitude: number, ...makers: Manufacturer[]): Gym {
  return { id, name, city: null, country: null, latitude, longitude, boards: makers.map(board) };
}

const utrecht = { latitude: 52.09, longitude: 5.12 };
const gyms = [
  gym('a', 'Boulderhal Energiehaven', 52.1, 5.07, 'kilter'),
  gym('b', 'Zuidhaven', 52.08, 5.11, 'kilter', 'moonboard'),
  gym('c', 'Klimhal Amsterdam', 52.37, 4.9, 'tension'),
  gym('d', 'Bloc Café Crème', 48.85, 2.35, 'moonboard'),
];
const all = { near: null, manufacturer: null, text: '', limit: 10 };

describe('gym map: one list for every manufacturer', () => {
  it('orders gyms nearest first and says how far each is', async () => {
    const found = await new GymFinder(new InMemoryGymSource(gyms)).find({ ...all, near: utrecht });
    expect(found.map((match) => match.gym.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(found[0]?.distanceKm).toBeGreaterThan(1);
    expect(found[0]?.distanceKm).toBeLessThan(2);
  });

  it('shows only gyms with the chosen manufacturer’s board, including mixed gyms', async () => {
    const found = await new GymFinder(new InMemoryGymSource(gyms)).find({
      ...all,
      manufacturer: 'moonboard',
    });
    expect(found.map((match) => match.gym.id).sort()).toEqual(['b', 'd']);
  });

  it('finds gyms by every word typed, ignoring case and accents', async () => {
    const finder = new GymFinder(new InMemoryGymSource(gyms));
    expect((await finder.find({ ...all, text: 'cafe creme' })).map((m) => m.gym.id)).toEqual(['d']);
    expect((await finder.find({ ...all, text: 'haven  boulderhal' })).map((m) => m.gym.id)).toEqual(['a']);
    expect(await finder.find({ ...all, text: 'nowhere' })).toEqual([]);
  });

  it('returns at most the asked number, and sorts by name without a point', async () => {
    const finder = new GymFinder(new InMemoryGymSource(gyms));
    expect((await finder.find({ ...all, limit: 2 })).map((m) => m.gym.name)).toEqual([
      'Bloc Café Crème',
      'Boulderhal Energiehaven',
    ]);
    expect((await finder.find({ ...all, limit: 1 }))[0]?.distanceKm).toBeNull();
  });

  it('tries the source again after a failed read', async () => {
    let calls = 0;
    const flaky: GymSource = {
      listGyms: () => (++calls === 1 ? Promise.reject(new Error('unreadable')) : Promise.resolve(gyms)),
    };
    const finder = new GymFinder(flaky);
    await expect(finder.find(all)).rejects.toThrow('unreadable');
    expect(await finder.find(all)).toHaveLength(4);
  });
});
