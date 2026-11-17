import type { Guidance } from './Guidance';

/** Sample data and the scripted radio are shown as such, never as a real catalog or board (AGENTS.md vocabulary). */
export function describeMode(mode: 'sample' | 'unverified'): Guidance | null {
  if (mode === 'unverified') return null;
  return {
    title: 'Sample data',
    action: 'Made up for trying the app. Nothing reaches a real board.',
  };
}
