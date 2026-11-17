/** Time comes in through this port (T.2). The zone is the phone's current IANA zone. */
export interface Clock {
  now(): Date;
  timeZone(): string;
}
