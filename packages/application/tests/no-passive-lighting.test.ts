import { describe, expect, it } from 'bun:test';
import {
  InMemoryProblemCache,
  InMemoryProviderSource,
  SourceBackedCatalog,
  buildSampleProviderData,
} from '@boardclimb/catalog-core';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { BoardConfiguration } from '@boardclimb/domain';
import { ClimbingLog, InMemoryLogStore, ProblemBrowser, noDiagnostics } from '@boardclimb/application';
import { FixedClock, SequentialIds, bench } from '@boardclimb/application/testing';

/**
 * Only an explicit Light up, or light on swipe the climber switched on, may change the LEDs (FR-008, FR-008a,
 * FR-017, acceptance 1 and 2, AC-018, AC-020). The recording
 * radio sees every write, so these tests observe the board's side instead of counting mock calls.
 */
describe('no passive lighting (FR-008)', () => {
  function world() {
    const data = buildSampleProviderData({
      manufacturer: 'kilter',
      gradeSystem: 'v',
      rated: true,
      problemsPerConfiguration: 30,
      boards: [{ id: 'b', name: 'B', configurations: [{ id: 'cfg', name: 'Cfg', angleDegrees: 40 }] }],
    });
    const source = new InMemoryProviderSource(data, {
      pagination: 'cursor',
      ratings: true,
      supportedGradeSystems: ['v'],
      deltaSync: false,
    });
    const catalog = new SourceBackedCatalog('kilter', source);
    const clock = new FixedClock(new Date('2026-11-16T10:00:00Z'));
    const browser = new ProblemBrowser({
      catalogs: () => catalog,
      cache: new InMemoryProblemCache(),
      clock,
      diagnostics: noDiagnostics,
      pageSize: 30,
    });
    const log = new ClimbingLog(new InMemoryLogStore(), clock, new SequentialIds());
    const configuration = data.configurations[0] as BoardConfiguration;
    return { browser, log, configuration, ...bench() };
  }

  it('acceptance 1: opening 20 problems and logging on each sends no LED command', async () => {
    const { browser, log, configuration, session, transport } = world();
    const found = await session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    await session.connect(found.boards[0], configuration);
    expect(session.snapshot().connection).toBe('connected');

    const page = await browser.browse(configuration, defaultProblemFilters, null);
    for (const summary of page.items.slice(0, 20)) {
      await browser.getProblem(configuration, summary);
      await log.addAttempt(summary.key);
      await log.setTop(summary.key, true);
    }
    await browser.browse(configuration, { ...defaultProblemFilters, minStars: 3 }, null);
    await browser.refresh(configuration);

    expect(transport.writeCount).toBe(0);
  });

  it('acceptance 2: losing the link, resuming the app and reconnecting restore no old pattern', async () => {
    const { browser, configuration, session, transport } = world();
    const found = await session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    await session.connect(found.boards[0], configuration);
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    const first = page.items[0];
    if (!first) throw new Error('fixture');
    await session.lightUp(await browser.getProblem(configuration, first));
    const written = transport.writeCount;
    expect(written).toBeGreaterThan(0);

    transport.simulateDisconnect('dev-1');
    await session.resume();
    await session.reconnect();
    expect(session.snapshot().connection).toBe('connected');
    expect(transport.writeCount).toBe(written);
  });

  it('sends exactly one command per explicit Light up', async () => {
    const { browser, configuration, session, transport } = world();
    const found = await session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    await session.connect(found.boards[0], configuration);
    const page = await browser.browse(configuration, defaultProblemFilters, null);
    const [a, b] = page.items;
    if (!a || !b) throw new Error('fixture');
    await session.lightUp(await browser.getProblem(configuration, a));
    expect(transport.writeCount).toBe(1);
    await session.lightUp(await browser.getProblem(configuration, b));
    expect(transport.writeCount).toBe(2);
    expect(new TextDecoder().decode(transport.writes[1]?.frame)).toBe(
      `SAMPLE ${(await browser.getProblem(configuration, b)).holds.map((hold) => hold.holdId).join(',')}`,
    );
  });

  async function connected() {
    const w = world();
    const found = await w.session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    await w.session.connect(found.boards[0], w.configuration);
    const page = await w.browser.browse(w.configuration, defaultProblemFilters, null);
    const problems = await Promise.all(
      page.items.slice(0, 20).map((summary) => w.browser.getProblem(w.configuration, summary)),
    );
    return { ...w, found: found.boards[0], problems };
  }

  it('FR-008a: with light on swipe off, settling on 20 problems sends nothing', async () => {
    const { session, transport, problems } = await connected();
    for (const problem of problems) expect(await session.showing(problem)).toBeNull();
    expect(transport.writeCount).toBe(0);
  });

  it('AC-020: with light on swipe on, the board shows the problem the climber settled on, once', async () => {
    const { session, transport, problems } = await connected();
    const [a, b] = problems;
    if (!a || !b) throw new Error('fixture');
    expect(session.setLightOnSwipe(true)).toBe(true);
    expect(transport.writeCount).toBe(0);

    await session.showing(a);
    await session.showing(b);
    await session.showing(b);
    expect(transport.writeCount).toBe(2);
    expect(new TextDecoder().decode(transport.writes[1]?.frame)).toBe(
      `SAMPLE ${b.holds.map((hold) => hold.holdId).join(',')}`,
    );
  });

  it('FR-008a: light on swipe cannot be switched on without a connection', async () => {
    const { session } = world();
    expect(session.setLightOnSwipe(true)).toBe(false);
    expect(session.snapshot().lightOnSwipe).toBe(false);
  });

  it('FR-017: after a lost link and reconnect, light on swipe waits for the next problem', async () => {
    const { session, transport, problems } = await connected();
    const [a, b] = problems;
    if (!a || !b) throw new Error('fixture');
    session.setLightOnSwipe(true);
    await session.showing(a);
    expect(transport.writeCount).toBe(1);

    transport.simulateDisconnect('dev-1');
    expect(await session.showing(b)).toBeNull();
    await session.resume();
    await session.reconnect();
    expect(session.snapshot().connection).toBe('connected');
    await session.showing(a);
    expect(transport.writeCount).toBe(1);

    await session.showing(b);
    expect(transport.writeCount).toBe(2);
  });

  it('FR-008a: disconnecting or connecting again switches light on swipe off', async () => {
    const { session, transport, problems, found, configuration } = await connected();
    const [a, b] = problems;
    if (!a || !b) throw new Error('fixture');
    session.setLightOnSwipe(true);
    await session.connect(found, configuration);
    expect(session.snapshot().lightOnSwipe).toBe(false);
    await session.showing(a);

    session.setLightOnSwipe(true);
    await session.disconnect();
    expect(session.snapshot().lightOnSwipe).toBe(false);
    await session.connect(found, configuration);
    await session.showing(b);
    expect(transport.writeCount).toBe(0);
  });
});
