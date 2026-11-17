import { expect, it } from 'bun:test';
import type { BoardConfiguration } from '@boardclimb/domain';
import { groupConfigurations } from './groupConfigurations';

function configuration(id: string, name: string, angleDegrees: number | null): BoardConfiguration {
  return { id, boardId: '1', manufacturer: 'kilter', name, angleDegrees };
}

it('UI-1: one group per layout, with its angles in ascending order', () => {
  const groups = groupConfigurations([
    configuration('a-40', 'Original · 12x12', 40),
    configuration('a-20', 'Original · 12x12', 20),
    configuration('b-40', 'Original · 7x10', 40),
  ]);
  expect(groups.map((group) => group.label)).toEqual(['Original · 12x12', 'Original · 7x10']);
  expect(groups[0]!.configurations.map((c) => c.angleDegrees)).toEqual([20, 40]);
});

it('UI-1: two layouts that share a name stay separate and are numbered, never merged into one angle list', () => {
  const groups = groupConfigurations([
    configuration('x-0', 'Homewall · 8x12', 0),
    configuration('x-5', 'Homewall · 8x12', 5),
    configuration('y-0', 'Homewall · 8x12', 0),
    configuration('y-5', 'Homewall · 8x12', 5),
    configuration('z-0', 'Homewall · 10x10', 0),
  ]);
  expect(groups.map((group) => group.label)).toEqual([
    'Homewall · 8x12 · option 1',
    'Homewall · 8x12 · option 2',
    'Homewall · 10x10',
  ]);
  expect(groups[1]!.configurations.map((c) => c.id)).toEqual(['y-0', 'y-5']);
});

it('UI-1: a fixed-angle board is one group with its single configuration', () => {
  const groups = groupConfigurations([configuration('f', 'Fixed wall', null)]);
  expect(groups).toHaveLength(1);
  expect(groups[0]!.configurations).toHaveLength(1);
});
