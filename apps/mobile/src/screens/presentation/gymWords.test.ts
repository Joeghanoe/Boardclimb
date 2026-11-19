import { describe, expect, it } from 'bun:test';
import type { Gym, GymBoard } from '@boardclimb/domain';
import { describeGymBoard } from './describeGymBoard';
import { describeGymPlace } from './describeGymPlace';
import { formatDistance } from './formatDistance';
import { layoutPresetFor } from './layoutPresetFor';
import { selectionForPreset } from './selectionForPreset';

const unlisted: GymBoard = {
  manufacturer: 'tension',
  name: null,
  boardName: null,
  angleDegrees: null,
  adjustable: null,
  lights: null,
};

describe('gym map wording', () => {
  it('names a wall the way the gym does, then its model and angle', () => {
    expect(
      describeGymBoard({
        manufacturer: 'kilter',
        name: 'Kilter Board 30',
        boardName: 'Kilter Board Original',
        angleDegrees: 30,
        adjustable: false,
        lights: true,
      }),
    ).toEqual({ title: 'Kilter Board 30', detail: 'Kilter Board Original · 30°' });
  });

  it('falls back to the manufacturer and says plainly when a board has no lights', () => {
    expect(describeGymBoard(unlisted)).toEqual({ title: 'Tension', detail: null });
    expect(
      describeGymBoard({ ...unlisted, manufacturer: 'moonboard', boardName: 'MoonBoard', lights: false }),
    ).toEqual({ title: 'MoonBoard', detail: 'No lights' });
    expect(describeGymBoard({ ...unlisted, manufacturer: 'kilter', adjustable: true })).toEqual({
      title: 'Kilter',
      detail: 'Adjustable',
    });
  });

  it('rounds distances to what helps choose a gym', () => {
    expect(formatDistance(0.004)).toBe('10 m');
    expect(formatDistance(0.347)).toBe('350 m');
    expect(formatDistance(2.44)).toBe('2.4 km');
    expect(formatDistance(1234.4)).toBe('1,234 km');
  });

  it('says where a gym is only from what its listing gives', () => {
    const gym: Gym = {
      id: 'g',
      name: 'G',
      city: 'Utrecht',
      country: 'NL',
      latitude: 0,
      longitude: 1,
      boards: [unlisted],
    };
    expect(describeGymPlace(gym)).toBe('Utrecht, NL');
    expect(describeGymPlace({ ...gym, city: null, country: null })).toBeNull();
    expect(layoutPresetFor(gym, unlisted)).toEqual({
      gymName: 'G',
      manufacturer: 'tension',
      boardName: null,
      angleDegrees: null,
    });
  });
});

describe('Climb from the gym map (selectionForPreset)', () => {
  const config = (id: string, angleDegrees: number) => ({
    id,
    manufacturer: 'kilter' as const,
    boardId: '1',
    name: id,
    angleDegrees,
  });
  const entries = [
    {
      manufacturer: 'kilter' as const,
      ok: true as const,
      boards: [
        {
          board: { id: '1', manufacturer: 'kilter' as const, name: 'Kilter Board Original' },
          configurations: [config('12x12-30', 30), config('12x12-40', 40), config('16x12-40', 40)],
        },
      ],
    },
  ] as unknown as Parameters<typeof selectionForPreset>[0];
  const preset = {
    gymName: 'G',
    manufacturer: 'kilter' as const,
    boardName: 'Kilter Board Original',
    angleDegrees: 30,
  };

  it('uses the one layout the listing points to', () => {
    expect(selectionForPreset(entries, preset, null)?.configuration.id).toBe('12x12-30');
  });

  it('never guesses between sizes: keeps the climber’s matching layout, or leaves it to the controller', () => {
    const at40 = { ...preset, angleDegrees: 40 };
    expect(selectionForPreset(entries, at40, null)).toBeNull();
    const current = { boardName: 'Kilter Board Original', configuration: config('16x12-40', 40) };
    expect(selectionForPreset(entries, at40, current as never)?.configuration.id).toBe('16x12-40');
    expect(selectionForPreset(entries, { ...preset, manufacturer: 'tension' }, current as never)).toBeNull();
  });
});
