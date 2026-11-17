import { describe, expect, it } from 'bun:test';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { Manufacturer } from '@boardclimb/domain';
import { firstLayout, openWorld } from './world';

const MANUFACTURERS: Manufacturer[] = ['kilter', 'moonboard', 'tension'];

describe.each(MANUFACTURERS)('%s: find, light and log a problem (FR-001, AC-014, AC-015)', (manufacturer) => {
  it('works end to end on the sample catalog and the scripted radio', async () => {
    const world = await openWorld({});
    const { container, transport } = world;
    const selection = await firstLayout(world, manufacturer);

    // browse and open without Bluetooth: nothing is written
    const page = await container.browser.browse(selection.configuration, defaultProblemFilters, null);
    const summary = page.items[0];
    if (!summary) throw new Error('fixture');
    const problem = await container.browser.getProblem(selection.configuration, summary);
    expect(transport.writeCount).toBe(0);

    // find the board, choose it, connect: still nothing is written
    const found = await container.session.discover(manufacturer);
    expect(found.ok && found.boards).toHaveLength(1);
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    expect(found.boards[0].detectedConfigurationId).toBeNull();
    expect((await container.session.connect(found.boards[0], selection.configuration)).ok).toBe(true);
    expect(transport.writeCount).toBe(0);

    // the explicit action lights the board and reports "sent", not "confirmed"
    expect((await container.session.lightUp(problem)).ok).toBe(true);
    expect(transport.writeCount).toBeGreaterThan(0);
    expect(container.session.snapshot().command.state).toBe('sent');

    // logging works and never touches the board again
    const writes = transport.writeCount;
    await container.log.addAttempt(problem.key);
    await container.log.setFlash(problem.key, true, true);
    const outcome = await container.log.summaryFor(problem.key);
    expect(outcome.ok && outcome.summary).toMatchObject({ top: true, flash: true, lifetimeAttempts: 2 });
    expect(transport.writeCount).toBe(writes);
  });

  it('only recognises its own sample controller among the boards nearby', async () => {
    const world = await openWorld({});
    const found = await world.container.session.discover(manufacturer);
    expect(found.ok && found.boards.map((board) => board.manufacturer)).toEqual([manufacturer]);
  });

  it('refuses to light a problem from a different layout without writing', async () => {
    const world = await openWorld({});
    const selection = await firstLayout(world, manufacturer);
    const page = await world.container.browser.browse(selection.configuration, defaultProblemFilters, null);
    const summary = page.items[0];
    if (!summary) throw new Error('fixture');
    const problem = await world.container.browser.getProblem(selection.configuration, summary);
    const found = await world.container.session.discover(manufacturer);
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    const other = { ...selection.configuration, id: 'some-other-layout' };
    await world.container.session.connect(found.boards[0], other);
    expect(await world.container.session.lightUp(problem)).toMatchObject({
      ok: false,
      code: 'unsupported_configuration',
    });
    expect(world.transport.writeCount).toBe(0);
  });
});

describe('unverified vendors say so instead of pretending (ADR-0002 section 7, acceptance 12)', () => {
  it('lists every manufacturer as provider_unverified and recognises no controller', async () => {
    const world = await openWorld({ mode: 'unverified' });
    const entries = await world.container.directory.list();
    expect(entries.map((entry) => entry.ok)).toEqual([false, false, false]);
    for (const manufacturer of MANUFACTURERS) {
      const found = await world.container.session.discover(manufacturer);
      expect(found).toEqual({ ok: true, boards: [] });
    }
    expect(world.transport.writeCount).toBe(0);
  });
});
