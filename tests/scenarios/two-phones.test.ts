import { describe, expect, it } from 'bun:test';
import { ScriptedBleTransport } from '@boardclimb/bluetooth-core';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { Problem } from '@boardclimb/domain';
import { createSampleTransport } from '../../apps/mobile/src/composition/createRegistry';
import { firstLayout, openWorld } from './world';
import type { World } from './world';

/** A radio that records into a board shared by two phones: the last write is what the LEDs show. */
class SharedBoardTransport extends ScriptedBleTransport {
  constructor(
    private readonly board: string[],
    private readonly phone: string,
  ) {
    super();
    this.devices = createSampleTransport().devices;
  }

  override write(deviceId: string, frame: Uint8Array): Promise<boolean> {
    this.board.push(`${this.phone}:${new TextDecoder().decode(frame)}`);
    return super.write(deviceId, frame);
  }
}

async function phone(board: string[], name: string) {
  const world = await openWorld({ transport: new SharedBoardTransport(board, name) });
  const selection = await firstLayout(world, 'kilter');
  const page = await world.container.browser.browse(selection.configuration, defaultProblemFilters, null);
  return { world, selection, page };
}

async function problemAt(
  p: { world: World; selection: Awaited<ReturnType<typeof firstLayout>>; page: { items: { key: string }[] } },
  index: number,
): Promise<Problem> {
  const summary = p.page.items[index] as Parameters<typeof p.world.container.browser.getProblem>[1];
  return p.world.container.browser.getProblem(p.selection.configuration, summary);
}

async function connect(p: Awaited<ReturnType<typeof phone>>): Promise<void> {
  const found = await p.world.container.session.discover('kilter');
  if (!found.ok || !found.boards[0]) throw new Error('fixture');
  await p.world.container.session.connect(found.boards[0], p.selection.configuration);
}

describe('two phones at one board (FR-010, AC-017, acceptance 2)', () => {
  it('browsing, opening and logging on a second phone never changes the LEDs', async () => {
    const board: string[] = [];
    const a = await phone(board, 'A');
    const b = await phone(board, 'B');
    await connect(a);
    await connect(b);

    const first = await problemAt(a, 0);
    await a.world.container.session.lightUp(first);
    expect(board).toHaveLength(1);

    for (let index = 0; index < 10; index += 1) {
      const opened = await problemAt(b, index);
      await b.world.container.log.addAttempt(opened.key);
    }
    expect(board).toHaveLength(1);
    expect(board[0]).toMatch(/^A:/);
  });

  it('the most recent explicit Light up wins, whichever phone sent it', async () => {
    const board: string[] = [];
    const a = await phone(board, 'A');
    const b = await phone(board, 'B');
    await connect(a);
    await connect(b);

    await a.world.container.session.lightUp(await problemAt(a, 0));
    await b.world.container.session.lightUp(await problemAt(b, 1));
    await a.world.container.session.lightUp(await problemAt(a, 2));
    expect(board.map((entry) => entry.slice(0, 1))).toEqual(['A', 'B', 'A']);
    expect(board.at(-1)).toMatch(/^A:/);
  });

  it('a controller that refuses a second phone is reported, not papered over (FR-011)', async () => {
    const board: string[] = [];
    const a = await phone(board, 'A');
    const b = await phone(board, 'B');
    await connect(a);
    await a.world.container.session.lightUp(await problemAt(a, 0));

    (b.world.transport as ScriptedBleTransport).connectResult = { ok: false, reason: 'busy' };
    const found = await b.world.container.session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    const result = await b.world.container.session.connect(found.boards[0], b.selection.configuration);

    expect(result).toMatchObject({ ok: false, code: 'takeover_unsupported' });
    expect(b.world.container.session.snapshot().connection).toBe('failed');
    expect(board).toHaveLength(1);
  });
});
