import { expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { CatalogError } from '@boardclimb/catalog-core';
import { ScriptedBleTransport } from '@boardclimb/bluetooth-core';
import { FixedClock, SequentialIds } from '@boardclimb/application/testing';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { Manufacturer } from '@boardclimb/domain';
import { SnapshotProviderSource } from '@boardclimb/provider-snapshots';
import type { SnapshotReader } from '@boardclimb/provider-snapshots';
import { BunSqliteDatabase } from '@boardclimb/storage-local/testing';
import { createAppContainer } from '../../apps/mobile/src/composition/createAppContainer';

it('AC-019, FR-001/006/008/015/017: real recorded catalogs survive restart/offline and only explicit lighting emits bytes', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'boardclimb-recorded-'));
  const file = join(folder, 'history.db');
  const files = new Map<string, Database>();
  let online = true;
  const reader: SnapshotReader = {
    open: async (manufacturer) => {
      if (!online) throw new CatalogError('network_unavailable', 'offline');
      let db = files.get(manufacturer);
      if (!db) {
        db = new Database(
          join(import.meta.dir, '../../packages/provider-snapshots/fixtures', manufacturer + '.db'),
          { readonly: true },
        );
        files.set(manufacturer, db);
      }
      const current = db;
      return {
        all: async <T>(sql: string, params: readonly (string | number | null)[]) =>
          current.query(sql).all(...params) as T[],
      };
    },
  };
  const sources = {
    kilter: new SnapshotProviderSource('kilter', reader),
    moonboard: new SnapshotProviderSource('moonboard', reader),
    tension: new SnapshotProviderSource('tension', reader),
  };
  const transport = new ScriptedBleTransport();
  transport.devices = [
    { id: 'k', name: 'Kilter Board#1@3' },
    { id: 'm', name: 'MoonBoard A' },
    { id: 't', name: 'Tension Board#2@2' },
    { id: 'gadget', name: 'Nordic UART' },
  ];
  const clock = new FixedClock(new Date('2026-11-17T10:00:00Z'));
  const ids = new SequentialIds();
  let database = new BunSqliteDatabase(file);
  try {
    let app = await createAppContainer({
      database,
      transport,
      clock,
      ids,
      mode: 'live',
      sources,
      pageSize: 10,
    });
    const choices: Record<Manufacturer, string> = {
      kilter: 'bs-1-7-40',
      moonboard: 'bs-2-1-40',
      tension: 'bs-9-1-40',
    };
    const remembered = [];
    for (const manufacturer of ['kilter', 'moonboard', 'tension'] as const) {
      const entry = (await app.directory.list()).find((e) => e.manufacturer === manufacturer);
      if (!entry?.ok) throw new Error('recorded directory');
      const configuration = entry.boards
        .flatMap((b) => b.configurations)
        .find((c) => c.id === choices[manufacturer]);
      if (!configuration) throw new Error('recorded config');
      const page = await app.browser.browse(configuration, defaultProblemFilters, null);
      const summary = page.items[0]!;
      const detail = await app.browser.getProblem(configuration, summary);
      expect(detail.bounds).toBeDefined();
      expect(detail.setter).toBeTruthy();
      expect(await app.log.addAttempt(summary.key)).toMatchObject({ ok: true });
      const discovered = await app.session.discover(manufacturer);
      expect(discovered.ok && discovered.boards.length).toBe(1);
      if (!discovered.ok) throw new Error('discovery');
      const previous = transport.writes.slice();
      expect(await app.session.connect(discovered.boards[0]!, configuration)).toMatchObject({ ok: true });
      expect(transport.writes).toEqual(previous);
      expect(await app.session.lightUp(detail)).toEqual({ ok: true, confirmed: false });
      const sent = transport.writes.slice();
      expect(sent.length).toBeGreaterThan(previous.length);
      expect(sent.slice(previous.length).every((w) => w.frame.length > 0)).toBe(true);
      transport.simulateDisconnect(discovered.boards[0]!.id);
      await app.session.resume();
      expect(transport.writes).toEqual(sent);
      await app.session.disconnect();
      remembered.push({ configuration, summary, detail });
    }
    expect((await app.browser.browseDownloaded(defaultProblemFilters, null)).items.length).toBe(10);
    database.close();
    online = false;
    database = new BunSqliteDatabase(file);
    app = await createAppContainer({ database, transport, clock, ids, mode: 'live', sources, pageSize: 50 });
    const writes = transport.writes.slice();
    const discovered = await app.browser.browseDownloaded(defaultProblemFilters, null);
    expect(new Set(discovered.items.map((p) => p.manufacturer))).toEqual(
      new Set(['kilter', 'moonboard', 'tension']),
    );
    const name = remembered[0]!.summary.name;
    expect(
      (await app.browser.browseDownloaded(defaultProblemFilters, null, name)).items.every((p) =>
        p.name.toLowerCase().includes(name.toLowerCase()),
      ),
    ).toBe(true);
    for (const { configuration, summary, detail } of remembered) {
      expect(await app.directory.selectionFor(summary)).toMatchObject({ configuration });
      const cached = await app.browser.browse(configuration, defaultProblemFilters, null);
      expect(cached.items.some((p) => p.key === summary.key)).toBe(true);
      expect(cached.notice).toBe('network_unavailable');
      expect(await app.browser.getProblem(configuration, summary)).toEqual(detail);
      expect(await app.log.summaryFor(summary.key)).toMatchObject({
        ok: true,
        summary: { lifetimeAttempts: 1 },
      });
    }
    expect(transport.writes).toEqual(writes);
  } finally {
    database.close();
    for (const db of files.values()) db.close();
    await rm(folder, { recursive: true, force: true });
  }
});
