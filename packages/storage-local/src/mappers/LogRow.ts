/** A `log_events` row as the driver returns it. Untrusted until toLogEvent has checked it. */
export interface LogRow {
  id: string;
  problem_key: string;
  occurred_at: string;
  session_date: string;
  time_zone: string;
  kind: string;
  delta: number | null;
  top: number | null;
  flash: number | null;
}
