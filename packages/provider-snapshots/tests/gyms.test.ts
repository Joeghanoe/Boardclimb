import { describe, expect, it } from 'bun:test';
import { gymManufacturers } from '@boardclimb/domain';
import type { Gym } from '@boardclimb/domain';
import {
  PinnedGymSource,
  mergeGyms,
  parseKilterGyms,
  parseMoonBoardGyms,
  parseTensionGyms,
} from '@boardclimb/provider-snapshots';
import recorded from '../fixtures/climbing-boards-gyms.json';
import pinned from '../data/gyms.json';

describe('gym listings (recorded public Climbing Boards dataset)', () => {
  it('reads Kilter gyms with each listed wall, its board model and fixed angle', () => {
    const gyms = parseKilterGyms(recorded.kilter);
    const energiehaven = gyms.find((gym) => gym.name === 'Boulderhal Energiehaven Utrecht');
    expect(energiehaven).toMatchObject({
      city: 'Utrecht',
      country: 'NL',
      latitude: 52.10039,
      longitude: 5.07082,
    });
    expect(energiehaven?.boards).toEqual([
      {
        manufacturer: 'kilter',
        name: 'Kilter Board 30',
        boardName: 'Kilter Board Original',
        angleDegrees: 30,
        adjustable: false,
        lights: true,
      },
      {
        manufacturer: 'kilter',
        name: 'Kilter Board 50',
        boardName: 'Kilter Board Original',
        angleDegrees: 50,
        adjustable: false,
        lights: true,
      },
    ]);
  });

  it('strips the literal quotes some listings put around names', () => {
    for (const gym of parseKilterGyms(recorded.kilter)) expect(gym.name).not.toMatch(/^"|"$/);
  });

  it('reads Tension gyms as one Tension board each, since walls are not listed', () => {
    const [first] = parseTensionGyms(recorded.tension);
    expect(first).toMatchObject({ id: 'tension:4084', name: 'Bouldergarten GmbH', city: null });
    expect(first?.boards).toEqual([
      {
        manufacturer: 'tension',
        name: null,
        boardName: null,
        angleDegrees: null,
        adjustable: null,
        lights: true,
      },
    ]);
  });

  it('keeps only commercial MoonBoards, says when one has no lights, and drops descriptions', () => {
    const gyms = parseMoonBoardGyms(recorded.moonboard);
    expect(gyms.map((gym) => gym.name)).toEqual(['The School Room', 'Craggy Island Moonboard']);
    expect(gyms.map((gym) => gym.boards[0]?.lights)).toEqual([true, false]);
    const twice = [...recorded.moonboard, ...recorded.moonboard];
    expect(parseMoonBoardGyms(twice)).toHaveLength(2);
    expect(JSON.stringify(gyms)).not.toContain('Description');
  });

  it('skips listings without a usable location', () => {
    const broken = [
      { properties: { id: 1, name: 'Nowhere', latitude: 0, longitude: 0 } },
      { properties: { id: 2, name: 'Off the map', latitude: 120, longitude: 5 } },
      { properties: { id: 3, name: 'Text', latitude: 'x', longitude: 5 } },
      { properties: null },
    ];
    expect(parseTensionGyms(broken)).toEqual([]);
  });
});

describe('merging the three maps into one', () => {
  const at = (
    id: string,
    name: string,
    latitude: number,
    longitude: number,
    maker: 'kilter' | 'tension' | 'moonboard',
  ): Gym => ({
    id,
    name,
    city: maker === 'kilter' ? 'Groningen' : null,
    country: null,
    latitude,
    longitude,
    boards: [
      {
        manufacturer: maker,
        name: null,
        boardName: null,
        angleDegrees: null,
        adjustable: null,
        lights: true,
      },
    ],
  });

  it('joins one place listed by two manufacturers, keeping the first name and filling the city', () => {
    const merged = mergeGyms([...parseKilterGyms(recorded.kilter), ...parseTensionGyms(recorded.tension)]);
    const apex = merged.filter((gym) => gym.name === 'Apex Boulders');
    expect(apex).toHaveLength(1);
    expect(gymManufacturers(apex[0] as Gym)).toEqual(['kilter', 'tension']);
  });

  it('joins nearby listings only when their names share a distinctive word', () => {
    const merged = mergeGyms([
      at('k1', 'Klimhal Sterk', 52, 5, 'kilter'),
      at('t1', 'Sterk Boulders', 52.001, 5, 'tension'),
      at('m1', 'Other Climbing Gym', 52.0012, 5, 'moonboard'),
    ]);
    expect(merged.map((gym) => [gym.id, gymManufacturers(gym)])).toEqual([
      ['k1', ['kilter', 'tension']],
      ['m1', ['moonboard']],
    ]);
  });

  it('joins listings in the same building whatever their names, but never two of one manufacturer', () => {
    const merged = mergeGyms([
      at('k1', 'North', 52, 5, 'kilter'),
      at('k2', 'South', 52, 5.0001, 'kilter'),
      at('m1', 'Moon room', 52.0001, 5, 'moonboard'),
    ]);
    expect(merged.map((gym) => [gym.id, gymManufacturers(gym)])).toEqual([
      ['k1', ['kilter', 'moonboard']],
      ['k2', ['kilter']],
    ]);
  });
});

describe('pinned gym list', () => {
  const gyms = pinned.gyms as Gym[];

  it('names its source and gives every gym an id, a real location and at least one board', () => {
    expect(pinned.source).toMatch(/^@hangtime\/climbing-boards@\d/);
    expect(new Set(gyms.map((gym) => gym.id)).size).toBe(gyms.length);
    for (const gym of gyms) {
      expect(gym.boards.length).toBeGreaterThan(0);
      expect(Math.abs(gym.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(gym.longitude)).toBeLessThanOrEqual(180);
    }
  });

  it('has gyms from all three manufacturers and the gym from the product owner’s screenshot', () => {
    const makers = new Set(gyms.flatMap((gym) => gymManufacturers(gym)));
    expect([...makers].sort()).toEqual(['kilter', 'moonboard', 'tension']);
    const energiehaven = gyms.find((gym) => gym.name === 'Boulderhal Energiehaven Utrecht');
    expect(energiehaven?.boards.map((board) => board.name)).toEqual(['Kilter Board 30', 'Kilter Board 50']);
  });

  it('is served by the pinned source', async () => {
    expect(await new PinnedGymSource().listGyms()).toHaveLength(gyms.length);
  });
});
