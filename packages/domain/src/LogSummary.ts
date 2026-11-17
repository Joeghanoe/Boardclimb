import type { DaySummary } from './DaySummary';

/** Everything the UI shows about one problem's log. Derived by summarizeLog, never stored (ADR-0003). */
export interface LogSummary {
  top: boolean;
  flash: boolean;
  /** Session day the current Top counts on, or null when Top is off. */
  topAchievedOn: string | null;
  sessionManualAttempts: number;
  sessionAttempts: number;
  lifetimeManualAttempts: number;
  lifetimeAttempts: number;
  /** Newest day first. */
  days: DaySummary[];
}
