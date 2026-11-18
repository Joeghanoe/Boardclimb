import { expect, it } from 'bun:test';
import type { BoardConfiguration } from '@boardclimb/domain';
import { pickConfiguration } from './pickConfiguration';

const at = (angle: number | null): BoardConfiguration => ({
  id: `c-${angle}`,
  boardId: '1',
  manufacturer: 'kilter',
  name: 'Original',
  angleDegrees: angle,
});

it('UI-1: keeps the climber’s angle when the layout has it', () => {
  expect(pickConfiguration([at(20), at(35), at(40)], 35)?.angleDegrees).toBe(35);
});

it('UI-1: falls back to the usual 40° when the layout lacks the chosen angle', () => {
  expect(pickConfiguration([at(25), at(40)], 70)?.angleDegrees).toBe(40);
});

it('UI-1: falls back to the first angle when neither is there, and to nothing for an empty layout', () => {
  expect(pickConfiguration([at(25), at(40 + 5)], 70)?.angleDegrees).toBe(25);
  expect(pickConfiguration([], 40)).toBeNull();
  expect(pickConfiguration([at(null)], 40)?.angleDegrees).toBeNull();
});
