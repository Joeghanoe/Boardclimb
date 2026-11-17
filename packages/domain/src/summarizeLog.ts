import type { DaySummary } from './DaySummary';
import type { LogEvent } from './LogEvent';
import type { LogSummary } from './LogSummary';

/**
 * The single owner of `attempts = manual + success` (CODE.10, ADR-0003). Pure: callers pass the events of one
 * problem in insert order and the current session day. The success contribution is 1 while Top is on and
 * counts on the day Top was last turned on.
 */
export function summarizeLog(events: readonly LogEvent[], today: string): LogSummary {
  const manualByDay = new Map<string, number>();
  let top = false;
  let flash = false;
  let topAchievedOn: string | null = null;

  for (const event of events) {
    if (event.kind === 'attempts') {
      manualByDay.set(event.sessionDate, (manualByDay.get(event.sessionDate) ?? 0) + event.delta);
      continue;
    }
    const nextTop = event.top || event.flash;
    if (nextTop && !top) topAchievedOn = event.sessionDate;
    if (!nextTop) topAchievedOn = null;
    top = nextTop;
    flash = nextTop && event.flash;
  }

  const dates = new Set(manualByDay.keys());
  if (topAchievedOn !== null) dates.add(topAchievedOn);

  const days: DaySummary[] = [...dates]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((sessionDate) => {
      const manualAttempts = manualByDay.get(sessionDate) ?? 0;
      const successContribution = sessionDate === topAchievedOn ? 1 : 0;
      return {
        sessionDate,
        manualAttempts,
        successContribution,
        attempts: manualAttempts + successContribution,
      };
    });

  const lifetimeManualAttempts = days.reduce((sum, day) => sum + day.manualAttempts, 0);
  const lifetimeAttempts = days.reduce((sum, day) => sum + day.attempts, 0);
  const todaySummary = days.find((day) => day.sessionDate === today);

  return {
    top,
    flash,
    topAchievedOn,
    sessionManualAttempts: todaySummary?.manualAttempts ?? 0,
    sessionAttempts: todaySummary?.attempts ?? 0,
    lifetimeManualAttempts,
    lifetimeAttempts,
    days,
  };
}
