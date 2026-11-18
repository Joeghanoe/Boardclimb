import type { BoardConfiguration, BoardModel, GradeSystem, Manufacturer } from '@boardclimb/domain';
import type { InMemoryProviderData } from './InMemoryProviderSource';
import { sampleProblemRecords } from './sampleProblemRecords';

export interface SampleBoardSpec {
  id: string;
  name: string;
  configurations: { id: string; name: string; angleDegrees: number | null }[];
}

export interface SampleDataSpec {
  manufacturer: Manufacturer;
  boards: SampleBoardSpec[];
  gradeSystem: GradeSystem;
  rated: boolean;
  problemsPerConfiguration: number;
}

/** Builds clearly labelled sample catalog data. Names and grades are made up; nothing here is a vendor fact. */
export function buildSampleProviderData(spec: SampleDataSpec): InMemoryProviderData {
  const boards: BoardModel[] = spec.boards.map(({ id, name }) => ({
    id,
    name,
    manufacturer: spec.manufacturer,
  }));
  const configurations: BoardConfiguration[] = spec.boards.flatMap((board) =>
    board.configurations.map((configuration) => ({
      id: configuration.id,
      boardId: board.id,
      manufacturer: spec.manufacturer,
      name: configuration.name,
      angleDegrees: configuration.angleDegrees,
    })),
  );
  const problems = Object.fromEntries(
    configurations.map((configuration) => [
      configuration.id,
      sampleProblemRecords({
        count: spec.problemsPerConfiguration,
        gradeSystem: spec.gradeSystem,
        rated: spec.rated,
        idPrefix: `${spec.manufacturer}-${configuration.id}`,
      }),
    ]),
  );
  return { boards, configurations, problems };
}
