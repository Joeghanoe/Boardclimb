import { describe, expect, it } from 'bun:test';
import { sessionDateFor } from '@boardclimb/domain';

describe('sessionDateFor (FR-014)', () => {
  it('uses the local calendar day of the zone, not the UTC day', () => {
    const instant = new Date('2026-03-01T23:30:00Z');
    expect(sessionDateFor(instant, 'UTC')).toBe('2026-03-01');
    expect(sessionDateFor(instant, 'Pacific/Auckland')).toBe('2026-03-02');
    expect(sessionDateFor(instant, 'America/Los_Angeles')).toBe('2026-03-01');
  });

  it('crosses midnight exactly at local midnight', () => {
    expect(sessionDateFor(new Date('2026-11-16T22:59:59Z'), 'Europe/Amsterdam')).toBe('2026-11-16');
    expect(sessionDateFor(new Date('2026-11-16T23:00:00Z'), 'Europe/Amsterdam')).toBe('2026-11-17');
  });
});
