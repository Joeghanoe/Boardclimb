import { expect, it } from 'bun:test';
import { makeGrade, makeProblemKey } from '@boardclimb/domain';
import type { Problem } from '@boardclimb/domain';
import { AuroraLedEncoder } from './AuroraLedEncoder';

const config = {
  manufacturer: 'kilter',
  boardId: '1',
  id: 'bs-1-7-40',
  name: 'Original',
  angleDegrees: 40,
} as const;
function problem(holds: Problem['holds']): Problem {
  return {
    key: makeProblemKey('kilter', config.id, 'test'),
    manufacturer: 'kilter',
    configurationId: config.id,
    providerProblemId: 'test',
    name: 'Test',
    grade: makeGrade('font', '6A'),
    rating: null,
    holds,
  };
}
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

it('FR-008 matches the upstream Aurora v3 interoperability vector byte for byte', () => {
  const result = new AuroraLedEncoder().encode(
    problem([{ holdId: '1', role: 'start', ledPosition: 42, ledColor: '00FF00' }]),
    config,
    'Kilter Board#123@3',
  );
  expect(result?.map(hex)).toEqual(['01046502542a001c03']);
});
it('FR-008 matches the upstream v2 power/position vector for a serial-less controller', () => {
  const p = problem([
    { holdId: '1', role: 'start', ledPosition: 10, ledColor: '00FF00' },
    { holdId: '2', role: 'hand', ledPosition: 256, ledColor: '0000FF' },
    { holdId: '3', role: 'finish', ledPosition: 500, ledColor: 'FF0000' },
  ]);
  expect(new AuroraLedEncoder().encode(p, config, 'Kilter Board')?.map(hex)).toEqual([
    '0107b302500a30000df4c103',
  ]);
});
it('FR-008 refuses empty, partial, unknown-version, overflow and dark patterns', () => {
  const encoder = new AuroraLedEncoder();
  for (const holds of [
    [],
    [{ holdId: '1', role: 'hand' as const }],
    [{ holdId: '1', role: 'hand' as const, ledPosition: 1024, ledColor: '00FF00' }],
    [{ holdId: '1', role: 'hand' as const, ledPosition: 1, ledColor: '000000' }],
  ])
    expect(encoder.encode(problem(holds), config, 'Kilter Board@2')).toBeNull();
  expect(
    encoder.encode(
      problem([{ holdId: '1', role: 'hand', ledPosition: 1, ledColor: '00FF00' }]),
      config,
      'Kilter Board@4',
    ),
  ).toBeNull();
});
it('FR-008 fragments large v3 patterns into bounded first and last protocol frames', () => {
  const p = problem(
    Array.from({ length: 100 }, (_, i) => ({
      holdId: String(i),
      role: 'hand',
      ledPosition: i,
      ledColor: '00FFFF',
    })),
  );
  const frames = new AuroraLedEncoder().encode(p, config, 'Kilter Board@3');
  expect(frames?.length).toBe(2);
  expect(frames?.map((f) => f[4])).toEqual([82, 83]);
  expect(frames?.every((f) => f.length <= 260)).toBe(true);
});
