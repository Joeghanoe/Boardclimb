import { useCallback, useEffect, useState } from 'react';
import type { BoardSelection, SettingsStore } from '@boardclimb/application';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';

/**
 * The chosen board layout, the grade and rating filters and the grade scale (Font by default). Both are read once at start and written on every
 * change, so they survive a restart and apply to every manufacturer (FR-007). A failed save keeps the on-screen
 * choice; the next change tries again.
 */
export function useBrowseSettings(settings: SettingsStore) {
  const [loaded, setLoaded] = useState(false);
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const [filters, setFilters] = useState<ProblemFilters>(defaultProblemFilters);
  const [gradeScale, setGradeScale] = useState<GradeSystem>('font');

  useEffect(() => {
    let cancelled = false;
    Promise.all([settings.loadBoardSelection(), settings.loadFilters(), settings.loadGradeScale()])
      .then(([savedSelection, savedFilters, savedScale]) => {
        if (cancelled) return;
        setSelection(savedSelection);
        if (savedFilters) setFilters(savedFilters);
        if (savedScale) setGradeScale(savedScale);
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

  const changeGradeScale = useCallback(
    (next: GradeSystem) => {
      setGradeScale(next);
      settings.saveGradeScale(next).catch(() => undefined);
    },
    [settings],
  );

  return { loaded, selection, filters, gradeScale, chooseSelection, changeFilters, changeGradeScale };
}
