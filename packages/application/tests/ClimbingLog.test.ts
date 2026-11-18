import { describe, expect, it } from 'bun:test';
import { makeProblemKey } from '@boardclimb/domain';
import type { LogEvent, ProblemKey } from '@boardclimb/domain';
import { ClimbingLog, InMemoryLogStore } from '@boardclimb/application';
import type { LogStore } from '@boardclimb/application';
import { FixedClock, SequentialIds } from '@boardclimb/application/testing';

const KEY = makeProblemKey('kilter', 'cfg', 'p-1');

function setup(
  now = '2026-11-16T10:00:00Z',
  zone = 'Europe/Amsterdam',
  store: LogStore = new InMemoryLogStore(),
) {
  const clock = new FixedClock(new Date(now), zone);
  return { store, clock, log: new ClimbingLog(store, clock, new SequentialIds()) };
}

async function summary(log: ClimbingLog, key: ProblemKey = KEY) {
  const outcome = await log.summaryFor(key);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.summary;
}

describe('logging use cases (ADR-0001 acceptance 3 to 7)', () => {
  it('acceptance 3 and 4: two attempts and Top give 3, and Top cycles only give 2 or 3', async () => {
    const { log } = setup();
    await log.addAttempt(KEY);
    await log.addAttempt(KEY);
    await log.setTop(KEY, true);
    expect(await summary(log)).toMatchObject({ lifetimeAttempts: 3, top: true, flash: false });
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await log.setTop(KEY, false);
      expect((await summary(log)).lifetimeAttempts).toBe(2);
      await log.setTop(KEY, true);
      expect((await summary(log)).lifetimeAttempts).toBe(3);
    }
  });

  it('acceptance 5 and 6: Flash alone gives 1 attempt, and Top off clears Flash', async () => {
    const { log } = setup();
    await log.setFlash(KEY, true);
    expect(await summary(log)).toMatchObject({ lifetimeAttempts: 1, top: true, flash: true });
    await log.setTop(KEY, false);
    expect(await summary(log)).toMatchObject({ lifetimeAttempts: 0, top: false, flash: false });
  });

  it('asks for acknowledgement before Flash on a problem with attempts, and stores nothing meanwhile', async () => {
    const { log, store } = setup();
    await log.addAttempt(KEY);
    const before = (await store.eventsFor(KEY)).length;
    expect(await log.setFlash(KEY, true)).toMatchObject({
      ok: false,
      code: 'flash_conflicts_with_failed_attempts',
    });
    expect((await store.eventsFor(KEY)).length).toBe(before);
    expect((await log.setFlash(KEY, true, true)).ok).toBe(true);
  });

  it('acceptance 7: a new calendar day starts at zero session attempts and keeps the total', async () => {
    const { log, clock } = setup('2026-11-16T10:00:00Z');
    await log.addAttempt(KEY);
    await log.addAttempt(KEY);
    clock.set('2026-11-16T23:30:00Z');
    expect(await summary(log)).toMatchObject({ sessionAttempts: 0, lifetimeAttempts: 2 });
    await log.addAttempt(KEY);
    expect(await summary(log)).toMatchObject({ sessionAttempts: 1, lifetimeAttempts: 3 });
  });

  it('keeps stored session dates when the phone changes time zone (FR-014)', async () => {
    const { log, clock, store } = setup('2026-11-16T10:00:00Z', 'Europe/Amsterdam');
    await log.addAttempt(KEY);
    clock.set('2026-11-16T12:00:00Z', 'Pacific/Auckland');
    const stored = (await store.eventsFor(KEY))[0] as LogEvent;
    expect(stored).toMatchObject({ sessionDate: '2026-11-16', timeZone: 'Europe/Amsterdam' });
    expect(log.today()).toBe('2026-11-17');
    expect(await summary(log)).toMatchObject({ sessionAttempts: 0, lifetimeAttempts: 1 });
  });

  it('records a lifted attempt in the editor and refuses to go below zero', async () => {
    const { log } = setup();
    await log.adjustAttempts(KEY, 4);
    expect((await log.adjustAttempts(KEY, -2)).ok).toBe(true);
    expect(await log.adjustAttempts(KEY, -5)).toMatchObject({
      ok: false,
      code: 'attempts_would_be_negative',
    });
    expect((await summary(log)).sessionManualAttempts).toBe(2);
  });
});

describe('logging stays correct under real-world timing (NFR-004)', () => {
  it('counts every one of 25 rapid taps', async () => {
    const { log } = setup();
    await Promise.all(Array.from({ length: 25 }, () => log.addAttempt(KEY)));
    expect((await summary(log)).lifetimeAttempts).toBe(25);
  });

  it('lets exactly one of two simultaneous removals win when only one attempt exists', async () => {
    const { log } = setup();
    await log.addAttempt(KEY);
    const results = await Promise.all([log.adjustAttempts(KEY, -1), log.adjustAttempts(KEY, -1)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect((await summary(log)).lifetimeAttempts).toBe(0);
  });

  it('reports a failed write as not saved and shows the previously stored totals (UC-006)', async () => {
    const memory = new InMemoryLogStore();
    let failing = false;
    const store: LogStore = {
      append: (events) => (failing ? Promise.reject(new Error('disk full')) : memory.append(events)),
      eventsFor: (key) => memory.eventsFor(key),
      eventsForMany: (keys) => memory.eventsForMany(keys),
    };
    const { log } = setup('2026-11-16T10:00:00Z', 'Europe/Amsterdam', store);
    await log.addAttempt(KEY);
    failing = true;
    expect(await log.addAttempt(KEY)).toMatchObject({ ok: false, code: 'storage_failed' });
    failing = false;
    expect((await summary(log)).lifetimeAttempts).toBe(1);
  });

  it('keeps working after a failed operation', async () => {
    const memory = new InMemoryLogStore();
    let reads = 0;
    const store: LogStore = {
      append: (events) => memory.append(events),
      eventsFor: (key) => (reads++ === 0 ? Promise.reject(new Error('locked')) : memory.eventsFor(key)),
      eventsForMany: (keys) => memory.eventsForMany(keys),
    };
    const { log } = setup('2026-11-16T10:00:00Z', 'Europe/Amsterdam', store);
    expect(await log.addAttempt(KEY)).toMatchObject({ ok: false, code: 'storage_failed' });
    expect((await log.addAttempt(KEY)).ok).toBe(true);
  });
});
