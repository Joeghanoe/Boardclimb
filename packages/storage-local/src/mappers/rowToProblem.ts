import { isBoardBounds } from '@boardclimb/domain';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { HoldPlacement, Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { ProblemRow } from './ProblemRow';
import { StorageError } from '../database/StorageError';

function corrupt(row: ProblemRow): StorageError {
  return new StorageError('storage_corrupt', `Cached problem ${row.problem_key} is not valid.`);
}

/** Reads a cached row as a domain summary. A row that cannot be trusted raises storage_corrupt. */
export function rowToSummary(row: ProblemRow): ProblemSummary {
  const manufacturer = MANUFACTURERS.find((candidate) => candidate === row.manufacturer);
  if ((row.grade_system !== 'font' && row.grade_system !== 'v') || !manufacturer) throw corrupt(row);
  return {
    key: row.problem_key as ProblemKey,
    manufacturer,
    configurationId: row.configuration_id,
    providerProblemId: row.provider_problem_id,
    name: row.name,
    grade: { system: row.grade_system, label: row.grade_label, difficulty: row.difficulty },
    rating: row.rating,
    ...(row.setter ? { setter: row.setter } : {}),
    ...(row.ascents === null ? {} : { ascents: row.ascents }),
  };
}

/** Reads a cached row with its stored hold mapping, or null when the problem was never opened. */
export function rowToProblem(row: ProblemRow): Problem | null {
  if (row.detail_json === null) return null;
  let holds: unknown;
  let setter: unknown;
  let bounds: Problem['bounds'];
  let mirroredHolds: unknown;
  try {
    const detail = JSON.parse(row.detail_json) as {
      holds?: unknown;
      setter?: unknown;
      bounds?: Problem['bounds'];
      mirroredHolds?: unknown;
    };
    holds = detail.holds;
    mirroredHolds = detail.mirroredHolds;
    setter = detail.setter;
    bounds = detail.bounds;
  } catch {
    throw corrupt(row);
  }
  const isHoldList = (value: unknown): value is HoldPlacement[] =>
    Array.isArray(value) &&
    value.every(
      (hold: Partial<HoldPlacement>) => typeof hold.holdId === 'string' && typeof hold.role === 'string',
    );
  if (!isHoldList(holds)) throw corrupt(row);
  if (mirroredHolds !== undefined && !isHoldList(mirroredHolds)) throw corrupt(row);
  if (bounds !== undefined && !isBoardBounds(bounds)) throw corrupt(row);
  if (setter !== undefined && typeof setter !== 'string') throw corrupt(row);
  return {
    ...rowToSummary(row),
    holds,
    ...(bounds ? { bounds } : {}),
    ...(typeof setter === 'string' ? { setter } : {}),
    ...(mirroredHolds === undefined ? {} : { mirroredHolds }),
  };
}
