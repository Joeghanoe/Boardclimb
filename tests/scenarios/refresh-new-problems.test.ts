import { expect, it } from 'bun:test';
import {
  InMemoryProviderSource,
  SourceBackedCatalog,
  InMemoryProblemCache,
  buildSampleProviderData,
} from '@boardclimb/catalog-core';
import { ProblemBrowser, RingDiagnosticsSink } from '@boardclimb/application';
import { FixedClock } from '@boardclimb/application/testing';
import { defaultProblemFilters } from '@boardclimb/domain';

it('FR-006/018: refresh reopens exhausted pagination without dropping cached rows', async () => {
  const data = buildSampleProviderData({
    manufacturer: 'kilter',
    gradeSystem: 'font',
    rated: true,
    problemsPerConfiguration: 3,
    boards: [
      { id: 'board', name: 'Board', configurations: [{ id: 'cfg', name: 'Layout', angleDegrees: 40 }] },
    ],
  });
  const source = new InMemoryProviderSource(data, {
    pagination: 'cursor',
    ratings: true,
    supportedGradeSystems: ['font'],
    deltaSync: false,
  });
  const catalog = new SourceBackedCatalog('kilter', source);
  const browser = new ProblemBrowser({
    catalogs: () => catalog,
    cache: new InMemoryProblemCache(),
    clock: new FixedClock(new Date('2026-11-17T10:00:00Z')),
    diagnostics: new RingDiagnosticsSink(),
    pageSize: 2,
  });
  const cfg = data.configurations[0]!;
  const first = await browser.browse(cfg, defaultProblemFilters, null);
  const last = await browser.browse(cfg, defaultProblemFilters, first.next);
  expect(last.hasMore).toBe(false);
  const original = data.problems.cfg![0]!;
  data.problems.cfg!.push({ ...original, id: 'kilter-cfg-4', name: 'New nightly problem' });
  expect(await browser.refresh(cfg)).toMatchObject({ ok: true });
  const again = await browser.browse(cfg, defaultProblemFilters, null);
  const following = await browser.browse(cfg, defaultProblemFilters, again.next);
  expect([...again.items, ...following.items].map((p) => p.name)).toContain('New nightly problem');
  expect(new Set([...again.items, ...following.items].map((p) => p.key)).size).toBe(4);
});
