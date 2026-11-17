import { MANUFACTURERS } from './Manufacturer';
import type { ParsedProblemKey } from './ParsedProblemKey';

function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return '';
  }
}

/** Inverse of makeProblemKey. Returns null for anything that is not a key this app produced. */
export function parseProblemKey(key: string): ParsedProblemKey | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [manufacturer, configurationId, providerProblemId] = parts.map(decode) as [string, string, string];
  const known = MANUFACTURERS.find((candidate) => candidate === manufacturer);
  if (!known || !configurationId || !providerProblemId) return null;
  return { manufacturer: known, configurationId, providerProblemId };
}
