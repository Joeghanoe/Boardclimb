import type { Problem } from '@boardclimb/domain';

/** The problem as shown and lit: its flipped holds when Flip is on and the board has a mirror for every hold. */
export function flipProblem<T extends Problem | null>(problem: T, flipped: boolean): T {
  if (!problem || !flipped || !problem.mirroredHolds) return problem;
  return { ...problem, holds: problem.mirroredHolds };
}
