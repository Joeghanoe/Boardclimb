/** A `problems` row as the driver returns it. Untrusted until toProblemSummary has checked it. */
export interface ProblemRow {
  seq: number;
  problem_key: string;
  manufacturer: string;
  configuration_id: string;
  provider_problem_id: string;
  name: string;
  grade_system: string;
  grade_label: string;
  difficulty: number | null;
  rating: number | null;
  setter: string | null;
  ascents: number | null;
  detail_json: string | null;
}
