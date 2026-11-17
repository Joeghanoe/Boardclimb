import { useCallback, useEffect, useState } from 'react';
import type { ClimbingLog, LogOutcome } from '@boardclimb/application';
import type { LogSummary, ProblemKey } from '@boardclimb/domain';
import { describeLogError } from './presentation/describeLogError';
import type { Guidance } from './presentation/Guidance';

/**
 * One problem's log for the detail screen. Every action returns the outcome so the screen can react to the
 * flash conflict; the summary shown is always the one re-read from storage after the write.
 */
export function useProblemLog(log: ClimbingLog, key: ProblemKey) {
  const [summary, setSummary] = useState<LogSummary | null>(null);
  const [problem, setProblem] = useState<Guidance | null>(null);

  const apply = useCallback((outcome: LogOutcome): LogOutcome => {
    if (outcome.ok) {
      setSummary(outcome.summary);
      setProblem(null);
    } else if (outcome.code !== 'flash_conflicts_with_failed_attempts') {
      setProblem(describeLogError(outcome.code));
    }
    return outcome;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    log.summaryFor(key).then((outcome) => {
      if (!cancelled) apply(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [log, key, apply]);

  return {
    summary,
    problem,
    today: log.today(),
    addAttempt: () => log.addAttempt(key).then(apply),
    adjustAttempts: (delta: number) => log.adjustAttempts(key, delta).then(apply),
    setTop: (value: boolean) => log.setTop(key, value).then(apply),
    setFlash: (value: boolean, acknowledge = false) => log.setFlash(key, value, acknowledge).then(apply),
  };
}
