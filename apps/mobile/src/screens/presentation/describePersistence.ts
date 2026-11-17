import type { Guidance } from './Guidance';

/** In the browser preview nothing is written to disk; the climber is told so before logging anything. */
export function describePersistence(persistent: boolean): Guidance | null {
  if (persistent) return null;
  return {
    title: 'Records are not saved here',
    action: 'Attempts are kept only until the page closes.',
  };
}
