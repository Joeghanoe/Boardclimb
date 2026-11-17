import { isBoardBounds } from '@boardclimb/domain';
import { makeGrade, makeProblemKey } from '@boardclimb/domain';
import type {
  BoardConfiguration,
  GradeSystem,
  HoldPlacement,
  HoldRole,
  Problem,
  ProblemSummary,
} from '@boardclimb/domain';
import type { ProviderProblemRecord } from './ProviderProblemRecord';
import type { ProviderProblemSummaryRecord } from './ProviderProblemSummaryRecord';

const GRADE_SYSTEMS: readonly string[] = ['font', 'v'];
const HOLD_ROLES: readonly string[] = ['start', 'hand', 'foot', 'finish'];

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validates an untrusted summary record and maps it to the domain. Returns null when it is malformed. */
export function toProblemSummary(
  configuration: BoardConfiguration,
  record: ProviderProblemSummaryRecord,
): ProblemSummary | null {
  const { id, name, gradeSystem, gradeLabel, rating } = record;
  if (!isText(id) || !isText(name) || !isText(gradeLabel) || !GRADE_SYSTEMS.includes(gradeSystem))
    return null;
  const ratingValid =
    rating === null || (typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 5);
  if (!ratingValid) return null;
  return {
    key: makeProblemKey(configuration.manufacturer, configuration.id, id),
    manufacturer: configuration.manufacturer,
    configurationId: configuration.id,
    providerProblemId: id,
    name,
    grade: makeGrade(gradeSystem as GradeSystem, gradeLabel),
    rating,
  };
}

/** Same as toProblemSummary, and every hold must be valid and at least one must exist. */
export function toProblem(configuration: BoardConfiguration, record: ProviderProblemRecord): Problem | null {
  const summary = toProblemSummary(configuration, record);
  if (!summary || !Array.isArray(record.holds) || record.holds.length === 0) return null;
  const holds: HoldPlacement[] = [];
  for (const hold of record.holds) {
    if (!isText(hold.holdId) || !HOLD_ROLES.includes(hold.role)) return null;
    if ([hold.x, hold.y, hold.ledPosition].some((value) => value !== undefined && !Number.isFinite(value)))
      return null;
    if (
      hold.ledPosition !== undefined &&
      (!Number.isInteger(hold.ledPosition) || hold.ledPosition < 0 || hold.ledPosition > 65535)
    )
      return null;
    if (hold.ledColor !== undefined && !/^[0-9a-f]{6}$/i.test(hold.ledColor)) return null;
    holds.push({ ...hold, role: hold.role as HoldRole });
  }
  if (record.setter !== undefined && !isText(record.setter)) return null;
  const bounds = record.bounds;
  if (bounds !== undefined && !isBoardBounds(bounds)) return null;
  return {
    ...summary,
    holds,
    ...(bounds ? { bounds } : {}),
    ...(record.setter ? { setter: record.setter } : {}),
  };
}
