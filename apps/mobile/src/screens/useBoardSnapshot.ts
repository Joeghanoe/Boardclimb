import { useSyncExternalStore } from 'react';
import type { BoardSession, BoardSessionSnapshot } from '@boardclimb/application';

/** Re-renders when the board session changes. The snapshot object is replaced on every change, never mutated. */
export function useBoardSnapshot(session: BoardSession): BoardSessionSnapshot {
  return useSyncExternalStore(
    (listener) => session.subscribe(listener),
    () => session.snapshot(),
  );
}
