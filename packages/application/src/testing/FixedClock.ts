import type { Clock } from '../ports/Clock';

/** A clock tests move by hand: across midnight, across time zones. */
export class FixedClock implements Clock {
  constructor(
    private current: Date,
    private zone = 'Europe/Amsterdam',
  ) {}

  now(): Date {
    return this.current;
  }

  timeZone(): string {
    return this.zone;
  }

  set(instant: string, zone?: string): void {
    this.current = new Date(instant);
    if (zone) this.zone = zone;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
