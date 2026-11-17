/** One session day of one problem's history. */
export interface DaySummary {
  sessionDate: string;
  manualAttempts: number;
  /** 1 when the current Top achievement counts on this day, otherwise 0. */
  successContribution: 0 | 1;
  attempts: number;
}
