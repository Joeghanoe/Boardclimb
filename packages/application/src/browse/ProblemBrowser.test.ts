import { describe, expect, it } from 'bun:test';
import {
  CatalogError,
  InMemoryProblemCache,
  InMemoryProviderSource,
  SourceBackedCatalog,
  buildSampleProviderData,
} from '@boardclimb/catalog-core';
import type { BoardCatalog, ProviderSource } from '@boardclimb/catalog-core';
import { defaultProblemFilters, makeGrade, matchesProblemFilters } from '@boardclimb/domain';
import type { BoardConfiguration, Manufacturer } from '@boardclimb/domain';
import { DIAGNOSTIC_FIELDS } from '../ports/DiagnosticEvent';
import { FixedClock, RecordingDiagnostics } from '../testing';
import { ProblemBrowser } from './ProblemBrowser';

function setup(
  options: { pagination?: 'cursor' | 'none'; rated?: boolean; count?: number; pageSize?: number } = {},
) {
  const { pagination = 'cursor', rated = true, count = 60, pageSize = 10 } = options;
  const data = buildSampleProviderData({
    manufacturer: 'kilter',
    gradeSystem: 'v',
    rated,
    problemsPerConfiguration: count,
    boards: [{ id: 'b', name: 'B', configurations: [{ id: 'cfg', name: 'Cfg', angleDegrees: 40 }] }],
  });
  const source = new InMemoryProviderSource(data, {
    pagination,
    ratings: rated,
    supportedGradeSystems: ['v'],
    deltaSync: false,
  });
  const catalog: BoardCatalog = new SourceBackedCatalog('kilter', source);
  const cache = new InMemoryProblemCache();
  const diagnostics = new RecordingDiagnostics();
  const clock = new FixedClock(new Date('2026-11-16T10:00:00Z'));
  const browser = new ProblemBrowser({
    catalogs: (_manufacturer: Manufacturer) => catalog,
    cache,
    clock,
    diagnostics,
    pageSize,
  });
  const configuration = data.configurations[0] as BoardConfiguration;
  return { browser, source, data, cache, diagnostics, configuration };
}

describe('incremental browsing with a cache (FR-006, AC-016)', () => {
  it('loads the first page on demand, then more pages as the climber scrolls', async () => {
    const { browser, source, configuration } = setup();
    const first = await browser.browse(configuration, defaultProblemFilters, null);
    expect(first).toMatchObject({ hasMore: true, freshness: 'fresh', notice: null });
    expect(first.items).toHaveLength(10);
    expect(source.fetchCount).toBe(1);

    const second = await browser.browse(configuration, defaultProblemFilters, first.next);
    expect(second.items).toHaveLength(10);
    expect(second.items[0]?.key).not.toBe(first.items[0]?.key);
    expect(source.fetchCount).toBe(2);
  });

  it('serves pages it already has without asking the provider (AC-016)', async () => {
    const { browser, source, configuration } = setup();
    const first = await browser.browse(configuration, defaultProblemFilters, null);
    await browser.browse(configuration, defaultProblemFilters, first.next);
    const fetchesSoFar = source.fetchCount;

    const again = await browser.browse(configuration, defaultProblemFilters, null);
    expect(again).toMatchObject({ freshness: 'cached', notice: null });
    expect(again.items).toEqual(first.items);
    expect(source.fetchCount).toBe(fetchesSoFar);
  });

  it('reaches the end exactly once and then says there is no more', async () => {
    const { browser, configuration } = setup({ count: 25 });
    let after: string | null = null;
    const seen: string[] = [];
    let hasMore = true;
    for (let guard = 0; hasMore && guard < 10; guard += 1) {
      const page = await browser.browse(configuration, defaultProblemFilters, after);
      seen.push(...page.items.map((item) => item.providerProblemId));
      after = page.next;
      hasMore = page.hasMore;
    }
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    expect(hasMore).toBe(false);
  });

  it('adapts a bulk-only provider: one response, cached, then served locally', async () => {
    const { browser, source, configuration } = setup({
      pagination: 'none',
      rated: false,
      count: 40,
      pageSize: 50,
    });
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    expect(page.items).toHaveLength(40);
    expect(page.hasMore).toBe(false);
    expect(source.fetchCount).toBe(1);
    await browser.browse(configuration, defaultProblemFilters, null);
    expect(source.fetchCount).toBe(1);
  });

  it('keeps fetching to fill a page when the filter hides most problems, and stops at the end', async () => {
    const { browser, data, configuration } = setup();
    const grade = makeGrade('v', 'V3').difficulty as number;
    const filters = { ...defaultProblemFilters, minDifficulty: grade, maxDifficulty: grade };
    const expected = (data.problems['cfg'] ?? []).filter((record) =>
      matchesProblemFilters(
        { grade: makeGrade('v', record.gradeLabel), rating: record.rating },
        filters,
        true,
      ),
    );
    const page = await browser.browse(configuration, filters, null);
    expect(page.items).toHaveLength(expected.length);
    expect(expected.length).toBeGreaterThan(0);
    expect(page.hasMore).toBe(false);
  });
});

describe('a background refresh never rewinds paging (FR-006)', () => {
  it('keeps the download position after a refresh, so scrolling on reaches new problems', async () => {
    // Deeper than one browse call may fetch (20 provider pages), as a real catalog is.
    const { browser, configuration } = setup({ count: 400, pageSize: 5 });
    let after: string | null = null;
    const seen = new Set<string>();
    for (let page = 0; page < 30; page += 1) {
      const result = await browser.browse(configuration, defaultProblemFilters, after);
      result.items.forEach((item) => seen.add(item.key));
      after = result.next;
    }

    await browser.refresh(configuration);

    const next = await browser.browse(configuration, defaultProblemFilters, after);
    expect(next.items).toHaveLength(5);
    expect(next.items.every((item) => !seen.has(item.key))).toBe(true);
  });

  it('reaches every problem in a narrow grade band even when refreshes happen while scrolling', async () => {
    const { browser, data, configuration } = setup({ count: 400, pageSize: 5 });
    const grade = makeGrade('v', 'V3').difficulty as number;
    const filters = { ...defaultProblemFilters, minDifficulty: grade };
    const expected = (data.problems['cfg'] ?? []).filter((record) =>
      matchesProblemFilters(
        { grade: makeGrade('v', record.gradeLabel), rating: record.rating },
        filters,
        true,
      ),
    ).length;
    let after: string | null = null;
    let total = 0;
    let hasMore = true;
    for (let guard = 0; hasMore && guard < 200; guard += 1) {
      const page = await browser.browse(configuration, filters, after);
      total += page.items.length;
      after = page.next ?? after;
      hasMore = page.hasMore;
      await browser.refresh(configuration);
    }
    expect(total).toBe(expected);
    expect(hasMore).toBe(false);
  });
});

describe('a catalog held on the device answers filtered pages itself (FR-006, FR-007)', () => {
  function onDevice(options: { failing?: boolean } = {}) {
    const data = buildSampleProviderData({
      manufacturer: 'kilter',
      gradeSystem: 'v',
      rated: true,
      problemsPerConfiguration: 120,
      boards: [{ id: 'b', name: 'B', configurations: [{ id: 'cfg', name: 'Cfg', angleDegrees: 40 }] }],
    });
    const base = new InMemoryProviderSource(data, {
      pagination: 'cursor',
      ratings: true,
      supportedGradeSystems: ['v'],
      deltaSync: false,
    });
    const source: ProviderSource = {
      capabilities: base.capabilities,
      fetchBoards: () => base.fetchBoards(),
      fetchConfigurations: (boardId) => base.fetchConfigurations(boardId),
      fetchProblem: (configurationId, id) => base.fetchProblem(configurationId, id),
      fetchProblemPage: () => Promise.reject(new Error('browsing must not copy the catalog page by page')),
      queryProblemPage: async (configurationId, filters, cursor, pageSize) => {
        if (options.failing) throw new CatalogError('network_unavailable', 'Catalog not downloaded yet.');
        const matching = (data.problems[configurationId] ?? []).filter((record) =>
          matchesProblemFilters(
            { grade: makeGrade('v', record.gradeLabel), rating: record.rating },
            filters,
            true,
          ),
        );
        const start = cursor === null ? 0 : Number(cursor);
        const records = matching.slice(start, start + pageSize);
        return { records, nextCursor: start + pageSize < matching.length ? String(start + pageSize) : null };
      },
    };
    const browser = new ProblemBrowser({
      catalogs: () => new SourceBackedCatalog('kilter', source),
      cache: new InMemoryProblemCache(),
      clock: new FixedClock(new Date('2026-11-16T10:00:00Z')),
      diagnostics: new RecordingDiagnostics(),
      pageSize: 10,
    });
    const filters = { ...defaultProblemFilters, minDifficulty: makeGrade('v', 'V5').difficulty };
    const expected = (data.problems['cfg'] ?? []).filter((record) =>
      matchesProblemFilters(
        { grade: makeGrade('v', record.gradeLabel), rating: record.rating },
        filters,
        true,
      ),
    );
    return { browser, configuration: data.configurations[0] as BoardConfiguration, filters, expected };
  }

  it('reaches every matching problem, page by page, without copying the catalog', async () => {
    const { browser, configuration, filters, expected } = onDevice();
    const seen: string[] = [];
    let after: string | null = null;
    for (let guard = 0; guard < 50; guard += 1) {
      const page = await browser.browse(configuration, filters, after);
      expect(page).toMatchObject({ freshness: 'fresh', notice: null });
      seen.push(...page.items.map((item) => item.providerProblemId));
      if (!page.hasMore) break;
      after = page.next;
    }
    expect(expected.length).toBeGreaterThan(10);
    expect(seen).toEqual(expected.map((record) => record.id));
  });

  it('keeps what it showed, so it appears under Downloaded and opens offline', async () => {
    const { browser, configuration, filters } = onDevice();
    const page = await browser.browse(configuration, filters, null);
    const downloaded = await browser.browseDownloaded(filters, null);
    expect(downloaded.items.map((item) => item.key)).toEqual(page.items.map((item) => item.key));
  });

  it('shows nothing new but says why when the catalog cannot be read', async () => {
    const { browser, configuration, filters } = onDevice({ failing: true });
    const page = await browser.browse(configuration, filters, null);
    expect(page).toMatchObject({
      items: [],
      hasMore: false,
      freshness: 'offline',
      notice: 'network_unavailable',
    });
  });
});

describe('failures keep what the climber already has (FR-006, acceptance 9, NFR-005)', () => {
  it('returns cached items with an offline notice when the provider fails', async () => {
    const { browser, source, configuration } = setup();
    const first = await browser.browse(configuration, defaultProblemFilters, null);

    source.failNext = new CatalogError('network_unavailable', 'offline');
    const next = await browser.browse(configuration, defaultProblemFilters, first.next);
    expect(next).toMatchObject({
      items: [],
      freshness: 'offline',
      notice: 'network_unavailable',
      hasMore: true,
    });

    const again = await browser.browse(configuration, defaultProblemFilters, null);
    expect(again.items).toEqual(first.items);
  });

  it('turns an unknown provider failure into a coded notice', async () => {
    const { browser, source, configuration } = setup();
    source.fetchProblemPage = () => Promise.reject(new Error('boom'));
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    expect(page).toMatchObject({ items: [], freshness: 'offline', notice: 'provider_rejected' });
  });
});

describe('background refresh (stale-while-revalidate)', () => {
  it('updates ratings in place and never removes a problem a catalog stopped listing (FR-018)', async () => {
    const { browser, data, configuration } = setup();
    const first = await browser.browse(configuration, defaultProblemFilters, null);
    const records = data.problems['cfg'] ?? [];
    const changed = records[0];
    if (!changed) throw new Error('fixture');
    changed.rating = 1.5;
    records.splice(1, 1);

    expect((await browser.refresh(configuration)).ok).toBe(true);
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    expect(page.items[0]?.rating).toBe(1.5);
    expect(page.items.map((item) => item.key)).toEqual(first.items.map((item) => item.key));
  });

  it('shares one request between overlapping refreshes', async () => {
    const { browser, source, configuration } = setup();
    await browser.browse(configuration, defaultProblemFilters, null);
    const before = source.fetchCount;
    await Promise.all([browser.refresh(configuration), browser.refresh(configuration)]);
    expect(source.fetchCount - before).toBe(1);
  });

  it('reports a failed refresh and leaves the cache alone', async () => {
    const { browser, source, configuration } = setup();
    const first = await browser.browse(configuration, defaultProblemFilters, null);
    source.failNext = new CatalogError('network_unavailable', 'offline');
    expect(await browser.refresh(configuration)).toEqual({ ok: false, code: 'network_unavailable' });
    expect((await browser.browse(configuration, defaultProblemFilters, null)).items).toEqual(first.items);
  });

  it('can be the very first fetch for a configuration', async () => {
    const { browser, configuration } = setup();
    const result = await browser.refresh(configuration);
    expect(result).toMatchObject({ ok: true, fetched: 10 });
  });
});

describe('problem details work offline once opened (UC-003, ADR-0002 section 2.5)', () => {
  it('fetches a detail once and serves it from the device afterwards', async () => {
    const { browser, source, configuration } = setup();
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    const summary = page.items[0];
    if (!summary) throw new Error('fixture');
    const opened = await browser.getProblem(configuration, summary);
    expect(opened.holds.length).toBeGreaterThan(0);
    const fetches = source.fetchCount;

    source.fetchProblem = () => Promise.reject(new CatalogError('network_unavailable', 'offline'));
    expect(await browser.getProblem(configuration, summary)).toEqual(opened);
    expect(source.fetchCount).toBe(fetches);
  });

  it('says so, with a code, when an unopened problem cannot be fetched offline', async () => {
    const { browser, source, configuration } = setup();
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    const summary = page.items[3];
    if (!summary) throw new Error('fixture');
    source.failNext = new CatalogError('network_unavailable', 'offline');
    await expect(browser.getProblem(configuration, summary)).rejects.toMatchObject({
      code: 'network_unavailable',
    });
  });
});

describe('diagnostics (NFR-009, SEC.2)', () => {
  it('reports sync results with counts and codes only', async () => {
    const { browser, source, diagnostics, configuration } = setup();
    await browser.browse(configuration, defaultProblemFilters, null);
    source.failNext = new CatalogError('network_unavailable', 'offline');
    await browser.refresh(configuration);
    expect(diagnostics.events).toHaveLength(2);
    expect(diagnostics.events[0]).toMatchObject({ name: 'catalog.sync_result', fetched: 10, code: null });
    expect(diagnostics.events[1]).toMatchObject({ code: 'network_unavailable' });
    for (const event of diagnostics.events) {
      for (const field of Object.keys(event)) expect(DIAGNOSTIC_FIELDS).toContain(field);
    }
  });
});
