import { describe, expect, it } from 'bun:test';
import { LogBench } from '../src/testing/LogBench';

describe('climbing log rules (FR-012, FR-013, FR-014)', () => {
  it('follows the ADR-0001 example table row by row', () => {
    const bench = new LogBench();
    const shape = () => ({
      manual: bench.summary.lifetimeManualAttempts,
      total: bench.summary.lifetimeAttempts,
      top: bench.summary.top,
      flash: bench.summary.flash,
    });

    bench.attempts(1);
    bench.attempts(1);
    expect(shape()).toEqual({ manual: 2, total: 2, top: false, flash: false });

    bench.setTop(true);
    expect(shape()).toEqual({ manual: 2, total: 3, top: true, flash: false });

    bench.setTop(false);
    expect(shape()).toEqual({ manual: 2, total: 2, top: false, flash: false });

    expect(bench.setFlash(true, true).ok).toBe(true);
    expect(shape()).toEqual({ manual: 2, total: 3, top: true, flash: true });

    bench.setFlash(false);
    expect(shape()).toEqual({ manual: 2, total: 3, top: true, flash: false });

    bench.setTop(false);
    expect(shape()).toEqual({ manual: 2, total: 2, top: false, flash: false });
  });

  it('AC-3: two attempts then Top gives attempts=3, top, no flash', () => {
    const bench = new LogBench();
    bench.attempts(1);
    bench.attempts(1);
    bench.setTop(true);
    expect(bench.summary).toMatchObject({ lifetimeAttempts: 3, top: true, flash: false });
  });

  it('AC-4: repeated Top on/off cycles only ever give 2 or 3', () => {
    const bench = new LogBench();
    bench.attempts(2);
    for (let cycle = 0; cycle < 10; cycle += 1) {
      bench.setTop(true);
      expect(bench.summary.lifetimeAttempts).toBe(3);
      bench.setTop(false);
      expect(bench.summary.lifetimeAttempts).toBe(2);
    }
  });

  it('AC-5: Flash with no earlier attempts gives attempts=1, top and flash', () => {
    const bench = new LogBench();
    expect(bench.setFlash(true).ok).toBe(true);
    expect(bench.summary).toMatchObject({ lifetimeAttempts: 1, top: true, flash: true });
  });

  it('AC-6: Top off clears Flash and totals never go negative', () => {
    const bench = new LogBench();
    bench.setFlash(true);
    bench.setTop(false);
    expect(bench.summary).toMatchObject({ top: false, flash: false, lifetimeAttempts: 0 });
  });

  it('switching Top to Flash does not add a second attempt', () => {
    const bench = new LogBench();
    bench.setTop(true);
    bench.setFlash(true);
    expect(bench.summary.lifetimeAttempts).toBe(1);
  });

  it('repeating a request changes nothing and appends no event', () => {
    const bench = new LogBench();
    bench.setTop(true);
    const before = bench.history.length;
    expect(bench.setTop(true)).toEqual({ ok: true, events: [] });
    expect(bench.setFlash(false)).toEqual({ ok: true, events: [] });
    expect(bench.history).toHaveLength(before);
  });

  it('asks before flashing a problem that already has attempts, and accepts the acknowledgement', () => {
    const bench = new LogBench();
    bench.attempts(1);
    const refused = bench.setFlash(true);
    expect(refused).toMatchObject({ ok: false, code: 'flash_conflicts_with_failed_attempts' });
    expect(bench.summary.flash).toBe(false);
    expect(bench.setFlash(true, true).ok).toBe(true);
    expect(bench.summary).toMatchObject({ top: true, flash: true, lifetimeAttempts: 2 });
  });

  it('never allows negative attempts on a session day', () => {
    const bench = new LogBench();
    bench.attempts(2);
    expect(bench.attempts(-3)).toMatchObject({ ok: false, code: 'attempts_would_be_negative' });
    expect(bench.attempts(-2).ok).toBe(true);
    expect(bench.summary.lifetimeManualAttempts).toBe(0);
    expect(bench.attempts(-1)).toMatchObject({ ok: false, code: 'attempts_would_be_negative' });
  });

  it('rejects fractional attempt changes and ignores zero', () => {
    const bench = new LogBench();
    expect(bench.attempts(0.5)).toMatchObject({ ok: false, code: 'invalid_attempt_delta' });
    expect(bench.attempts(0)).toEqual({ ok: true, events: [] });
  });
});

describe('sessions are local calendar days (FR-014, AC-7)', () => {
  it('starts a new day at zero session attempts and keeps lifetime history', () => {
    const bench = new LogBench();
    bench.day = '2026-11-15';
    bench.attempts(3);
    bench.setTop(true);
    bench.day = '2026-11-16';
    expect(bench.summary).toMatchObject({
      sessionAttempts: 0,
      lifetimeAttempts: 4,
      top: true,
      topAchievedOn: '2026-11-15',
    });
    bench.attempts(1);
    expect(bench.summary).toMatchObject({ sessionAttempts: 1, lifetimeAttempts: 5 });
  });

  it('does not let today remove attempts that belong to an earlier day', () => {
    const bench = new LogBench();
    bench.day = '2026-11-15';
    bench.attempts(2);
    bench.day = '2026-11-16';
    expect(bench.attempts(-1)).toMatchObject({ ok: false, code: 'attempts_would_be_negative' });
    expect(bench.summary.lifetimeManualAttempts).toBe(2);
  });

  it('lists days newest first with their own totals', () => {
    const bench = new LogBench();
    bench.day = '2026-11-14';
    bench.attempts(1);
    bench.day = '2026-11-16';
    bench.attempts(2);
    bench.setTop(true);
    expect(bench.summary.days).toEqual([
      { sessionDate: '2026-11-16', manualAttempts: 2, successContribution: 1, attempts: 3 },
      { sessionDate: '2026-11-14', manualAttempts: 1, successContribution: 0, attempts: 1 },
    ]);
  });

  it('moves the success contribution to the day Top is turned on again', () => {
    const bench = new LogBench();
    bench.day = '2026-11-14';
    bench.setTop(true);
    bench.day = '2026-11-16';
    bench.setTop(false);
    bench.setTop(true);
    expect(bench.summary).toMatchObject({ topAchievedOn: '2026-11-16', lifetimeAttempts: 1 });
  });

  it('keeps a historical edit on its own date when appended later', () => {
    const bench = new LogBench();
    bench.day = '2026-11-16';
    bench.attempts(1);
    bench.day = '2026-11-10';
    bench.attempts(2);
    bench.day = '2026-11-16';
    expect(bench.summary.days.map((day) => [day.sessionDate, day.attempts])).toEqual([
      ['2026-11-16', 1],
      ['2026-11-10', 2],
    ]);
  });
});

describe('invariants under random action sequences (NFR-004)', () => {
  function random(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('holds for seed %i', (seed) => {
    const next = random(seed);
    const bench = new LogBench();
    const days = ['2026-11-14', '2026-11-15', '2026-11-16'];
    for (let step = 0; step < 400; step += 1) {
      bench.day = days[Math.floor(next() * days.length)] as string;
      const pick = next();
      if (pick < 0.3) bench.attempts(1);
      else if (pick < 0.4) bench.attempts(-1);
      else if (pick < 0.6) bench.setTop(next() < 0.5);
      else bench.setFlash(next() < 0.5, true);

      const summary = bench.summary;
      if (summary.flash) expect(summary.top).toBe(true);
      expect(summary.lifetimeManualAttempts).toBeGreaterThanOrEqual(0);
      expect(summary.lifetimeAttempts).toBe(summary.lifetimeManualAttempts + (summary.top ? 1 : 0));
      for (const day of summary.days) expect(day.manualAttempts).toBeGreaterThanOrEqual(0);
    }
  });
});
