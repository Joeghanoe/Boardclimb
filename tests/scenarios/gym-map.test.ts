import { describe, expect, it } from 'bun:test';
import { gymManufacturers } from '@boardclimb/domain';
import { SnapshotProviderSource } from '@boardclimb/provider-snapshots';
import type { SnapshotReader } from '@boardclimb/provider-snapshots';
import { openWorld } from './world';

describe('combined gym map', () => {
  it('finds a gym from any manufacturer’s map and lists its boards, without touching the board or the log', async () => {
    const world = await openWorld();
    const [energiehaven] = await world.container.gyms.find({
      near: null,
      manufacturer: null,
      text: 'energiehaven utrecht',
      limit: 5,
    });
    expect(energiehaven?.gym.boards.map((board) => [board.name, board.angleDegrees])).toEqual([
      ['Kilter Board 30', 30],
      ['Kilter Board 50', 50],
    ]);

    const sheffield = { latitude: 53.38, longitude: -1.47 };
    const nearby = await world.container.gyms.find({
      near: sheffield,
      manufacturer: 'moonboard',
      text: '',
      limit: 20,
    });
    expect(nearby.map((match) => match.gym.name)).toContain('The School Room');
    for (const match of nearby) expect(gymManufacturers(match.gym)).toContain('moonboard');

    expect(world.transport.calls).toEqual([]);
  });

  it('names board models the board picker can start on', async () => {
    const world = await openWorld();
    const gyms = await world.container.gyms.find({
      near: null,
      manufacturer: null,
      text: '',
      limit: 100_000,
    });
    const named = new Set(gyms.flatMap((m) => m.gym.boards.map((b) => `${b.manufacturer}/${b.boardName}`)));
    // Board lists come from bundled hardware data; no catalog download is needed.
    const reader: SnapshotReader = { open: () => Promise.reject(new Error('not needed')) };
    for (const [manufacturer, model] of [
      ['kilter', 'Kilter Board Original'],
      ['kilter', 'Kilter Board Homewall'],
      ['moonboard', 'MoonBoard'],
    ] as const) {
      const boards = await new SnapshotProviderSource(manufacturer, reader).fetchBoards();
      expect(named.has(`${manufacturer}/${model}`)).toBe(true);
      expect(boards.map((board) => board.name)).toContain(model);
    }
  });
});
