import { useCallback, useEffect, useState } from 'react';
import type { BoardSelection, SettingsStore } from '@boardclimb/application';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { ProblemFilters } from '@boardclimb/domain';

/**
 * The chosen board layout and the grade and rating filters. Both are read once at start and written on every
 * change, so they survive a restart and apply to every manufacturer (FR-007). A failed save keeps the on-screen
 * choice; the next change tries again.
 */
export function useBrowseSettings(settings: SettingsStore) {
  const [loaded, setLoaded] = useState(false);
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const [filters, setFilters] = useState<ProblemFilters>(defaultProblemFilters);

  useEffect(() => {
    let cancelled = false;
    Promise.all([settings.loadBoardSelection(), settings.loadFilters()])
      .then(([savedSelection, savedFilters]) => {
        if (cancelled) return;
        setSelection(savedSelection);
        if (savedFilters) setFilters(savedFilters);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  const chooseSelection = useCallback(
    (next: BoardSelection) => {
      setSelection(next);
      settings.saveBoardSelection(next).catch(() => undefined);
    },
    [settings],
  );

  const changeFilters = useCallback(
    (next: ProblemFilters) => {
      setFilters(next);
      settings.saveFilters(next).catch(() => undefined);
    },
    [settings],
  );

  return { loaded, selection, filters, chooseSelection, changeFilters };
}
