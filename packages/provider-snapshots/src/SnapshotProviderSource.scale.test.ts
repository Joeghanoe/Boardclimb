import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import type { Manufacturer } from '@boardclimb/domain';
import { SnapshotProviderSource } from './SnapshotProviderSource';
import type { SnapshotReader } from './SnapshotReader';

function subject(manufacturer: Manufacturer) {
  const db = new Database(join(import.meta.dir, '../fixtures', `${manufacturer}.db`), { readonly: true });
  const reader: SnapshotReader = {
    open: async () => ({
      all: async <T>(sql: string, params: readonly (string | number | null)[]) =>
        db.query(sql).all(...params) as T[],
    }),
  };
  return { db, source: new SnapshotProviderSource(manufacturer, reader) };
}

describe('reading the bundled hardware metadata stays fast (CODE.9)', () => {
  it('opens 2,000 Kilter problems inside the budget', async () => {
    const { db, source } = subject('kilter');
    try {
      const { records } = await source.fetchProblemPage('bs-1-7-40', null, 1000);
      expect(records.length).toBeGreaterThan(0);
      const started = performance.now();
      let holds = 0;
      for (let opened = 0; opened < 2000; opened += 1)
        holds += (await source.fetchProblem('bs-1-7-40', records[opened % records.length]!.id)).holds.length;
      expect(holds).toBeGreaterThan(2000);
      // Generous for CI runners: this catches a return to per-hold table scans on slow devices, not small drift.
      expect(performance.now() - started).toBeLessThan(1500);
    } finally {
      db.close();
    }
  });

  it('checks 5,000 configuration ids inside the budget', async () => {
    const source = new SnapshotProviderSource('kilter', { open: async () => ({ all: async () => [] }) });
    const started = performance.now();
    for (let checked = 0; checked < 5000; checked += 1) await source.fetchProblemPage('bs-1-7-40', null, 1);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
