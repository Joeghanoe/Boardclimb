import type { Manufacturer } from '../board/Manufacturer';
import type { ProblemKey } from './ProblemKey';

export function makeProblemKey(
  manufacturer: Manufacturer,
  configurationId: string,
  providerProblemId: string,
): ProblemKey {
  const parts = [manufacturer, configurationId, providerProblemId];
  if (parts.some((part) => part.length === 0)) {
    throw new Error('A problem key needs a manufacturer, configuration id and provider problem id.');
  }
  return parts.map(encodeURIComponent).join('/') as ProblemKey;
}
