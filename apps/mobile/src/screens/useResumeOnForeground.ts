import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { BoardSession } from '@boardclimb/application';

/**
 * When the app returns to the foreground, a dropped link is reopened. `resume` never sends a lighting
 * command, so the previous problem is not shown again by itself (FR-017).
 */
export function useResumeOnForeground(session: BoardSession): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void session.resume();
    });
    return () => subscription.remove();
  }, [session]);
}
