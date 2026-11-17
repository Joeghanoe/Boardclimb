import { describe, expect, it } from 'bun:test';
import { makeProblemKey } from '@boardclimb/domain';
import type { LogEvent } from '@boardclimb/domain';
import type { LogStore } from '../ports/LogStore';

const A = makeProblemKey('kilter', 'cfg', 'a');
const B = makeProblemKey('moonboard', 'cfg', 'b');

function attempts(id: string, key = A, delta = 1, sessionDate = '2026-11-16'): LogEvent {
  return {
    id,
    kind: 'attempts',
    problemKey: key,
    delta,
    occurredAt: `${sessionDate}T09:00:00.000Z`,
    sessionDate,
    timeZone: 'Europe/Amsterdam',
  };
}

function achievement(id: string, top: boolean, flash: boolean, key = A): LogEvent {
  return {
    id,
    kind: 'achievement',
    problemKey: key,
    top,
    flash,
    occurredAt: '2026-11-16T09:30:00.000Z',
    sessionDate: '2026-11-16',
    timeZone: 'America/New_York',
  };
}

/** The shared LogStore contract (ADR-0003). The in-memory store and the SQLite store both run it. */
export function runLogStoreContract(name: string, create: () => LogStore | Promise<LogStore>): void {
  describe(`${name} satisfies the LogStore contract`, () => {
    it('returns events in insert order with every field intact (FR-018)', async () => {
      const store = await create();
      const events = [attempts('1'), achievement('2', true, true), attempts('3', A, -1, '2026-11-15')];
      await store.append(events);
      expect(await store.eventsFor(A)).toEqual(events);
    });

    it('ignores an event whose id is already stored, so retries are harmless (idempotency)', async () => {
      const store = await create();
      await store.append([attempts('1')]);
      await store.append([attempts('1'), attempts('2')]);
      expect((await store.eventsFor(A)).map((event) => event.id)).toEqual(['1', '2']);
    });

    it('keeps problems apart and groups several in one read', async () => {
      const store = await create();
      await store.append([attempts('1'), attempts('2', B), attempts('3')]);
      expect((await store.eventsFor(B)).map((event) => event.id)).toEqual(['2']);
      const many = await store.eventsForMany([A, B, makeProblemKey('tension', 'cfg', 'none')]);
      expect(many.get(A)?.map((event) => event.id)).toEqual(['1', '3']);
      expect(many.get(B)?.map((event) => event.id)).toEqual(['2']);
      expect(many.get(makeProblemKey('tension', 'cfg', 'none'))).toEqual([]);
    });

    it('returns nothing for a problem without history', async () => {
      const store = await create();
      expect(await store.eventsFor(A)).toEqual([]);
    });
  });
}
