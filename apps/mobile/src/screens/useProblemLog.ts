import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClimbingLog, LogOutcome } from '@boardclimb/application';
import type { LogSummary, ProblemKey } from '@boardclimb/domain';
import { describeLogError } from './presentation/describeLogError';
import type { Guidance } from './presentation/Guidance';

/**
 * One problem's log for the detail screen. Every action returns the outcome so the screen can react to the
 * flash conflict; the summary shown is always one read from storage. Neighbouring problems can be read ahead
 * (`prefetch`) so stepping to them shows their log at once; storage is re-read on arrival regardless.
 */
export function useProblemLog(log: ClimbingLog, key: ProblemKey) {
  const known = useRef(new Map<ProblemKey, LogSummary>());
  const [summary, setSummary] = useState<LogSummary | null>(() => known.current.get(key) ?? null);
  const [shownKey, setShownKey] = useState(key);
  const [problem, setProblem] = useState<Guidance | null>(null);

  if (shownKey !== key) {
    setShownKey(key);
    setSummary(known.current.get(key) ?? null);
    setProblem(null);
  }

  const applyFor = useCallback(
    (forKey: ProblemKey) =>
      (outcome: LogOutcome): LogOutcome => {
        if (outcome.ok) {
          known.current.set(forKey, outcome.summary);
          if (forKey === key) {
            setSummary(outcome.summary);
            setProblem(null);
          }
        } else if (forKey === key && outcome.code !== 'flash_conflicts_with_failed_attempts') {
          setProblem(describeLogError(outcome.code));
        }
        return outcome;
      },
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    log.summaryFor(key).then((outcome) => {
      if (!cancelled) applyFor(key)(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [log, key, applyFor]);

  const prefetch = useCallback(
    (keys: readonly ProblemKey[]) => {
      for (const other of keys) {
        if (other === key || known.current.has(other)) continue;
        void log.summaryFor(other).then((outcome) => {
          if (outcome.ok) known.current.set(other, outcome.summary);
        });
      }
    },
    [log, key],
  );

  const apply = applyFor(key);
  return {
    summary,
    problem,
    today: log.today(),
    prefetch,
    addAttempt: () => log.addAttempt(key).then(apply),
    adjustAttempts: (delta: number) => log.adjustAttempts(key, delta).then(apply),
    setTop: (value: boolean) => log.setTop(key, value).then(apply),
    setFlash: (value: boolean, acknowledge = false) => log.setFlash(key, value, acknowledge).then(apply),
  };
}
