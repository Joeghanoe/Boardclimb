import type { Guidance } from './Guidance';

/** Sample data and the scripted radio are shown as such, never as a real catalog or board (AGENTS.md vocabulary). */
export function describeMode(mode: 'sample' | 'unverified' | 'live'): Guidance | null {
  if (mode === 'live')
    return {
      title: 'Check the lights',
      action: 'Board compatibility is being tested. Check the lit holds before climbing.',
    };
  if (mode === 'unverified') return null;
  return {
    title: 'Sample data',
    action: 'Made up for trying the app. Nothing reaches a real board.',
  };
}
