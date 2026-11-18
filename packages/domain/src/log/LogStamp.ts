/** What the application supplies for a new log event: identity and when/where it happened (ADR-0003). */
export interface LogStamp {
  /** Client-generated unique id; storing the same id twice is a no-op. */
  id: string;
  /** UTC instant, ISO 8601. */
  occurredAt: string;
  /** Local calendar day at logging time, YYYY-MM-DD. Never recomputed later. */
  sessionDate: string;
  /** IANA time zone at logging time. */
  timeZone: string;
}
