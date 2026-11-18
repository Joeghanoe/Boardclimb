import { expect, it } from 'bun:test';
import { makeGrade, makeProblemKey } from '@boardclimb/domain';
import type { Problem } from '@boardclimb/domain';
import { MoonBoardLedEncoder } from '@boardclimb/board-moonboard';
const config = {
  id: 'bs-2-1-40',
  boardId: '1',
  manufacturer: 'moonboard',
  name: '2016',
  angleDegrees: 40,
} as const;
const p: Problem = {
  key: makeProblemKey('moonboard', config.id, 'test'),
  manufacturer: 'moonboard',
  configurationId: config.id,
  providerProblemId: 'test',
  name: 'Test',
  grade: makeGrade('font', '6A'),
  rating: null,
  holds: [
    { holdId: '1', role: 'start' },
    { holdId: '2', role: 'hand' },
    { holdId: '198', role: 'finish' },
  ],
};
it('FR-008 addresses the standard serpentine grid and role markers', () => {
  expect(new TextDecoder().decode(new MoonBoardLedEncoder().encode(p, config)?.[0])).toBe('l#S0,P35,E197#');
});
it('FR-008 uses the 12-row Mini strip and refuses unsupported or empty holds', () => {
  const encoder = new MoonBoardLedEncoder();
  expect(
    new TextDecoder().decode(
      encoder.encode(
        { ...p, holds: [{ holdId: '132', role: 'finish' }] },
        { ...config, id: 'bs-6-1-40' },
      )?.[0],
    ),
  ).toBe('l#E131#');
  expect(encoder.encode(p, { ...config, id: 'bs-6-1-40' })).toBeNull();
  expect(encoder.encode({ ...p, holds: [] }, config)).toBeNull();
  expect(encoder.encode({ ...p, holds: [{ holdId: '1', role: 'foot' }] }, config)).toBeNull();
});
