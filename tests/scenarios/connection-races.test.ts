import { expect, it } from 'bun:test';
import { BoardSession, RingDiagnosticsSink } from '@boardclimb/application';
import { FixedClock } from '@boardclimb/application/testing';
import { ScriptedBleTransport } from '@boardclimb/bluetooth-core';
import type { TransportConnectResult } from '@boardclimb/bluetooth-core';
import { makeGrade, makeProblemKey } from '@boardclimb/domain';
import { controllerLookup, createControllers } from '../../apps/mobile/src/composition/createRegistry';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
class SlowTransport extends ScriptedBleTransport {
  readonly a = deferred<TransportConnectResult>();
  readonly b = deferred<TransportConnectResult>();
  readonly started = deferred<void>();
  override connect(id: string): Promise<TransportConnectResult> {
    if (id === 'A') {
      this.started.resolve();
      return this.a.promise;
    }
    return this.b.promise;
  }
}
const cfg = {
  manufacturer: 'kilter',
  id: 'bs-1-7-40',
  boardId: '1',
  name: 'Original',
  angleDegrees: 40,
} as const;
const a = { manufacturer: 'kilter', id: 'A', name: 'Kilter Board@3', detectedConfigurationId: null } as const;
const b = { ...a, id: 'B' };
const problem = {
  manufacturer: 'kilter',
  key: makeProblemKey('kilter', cfg.id, 'test'),
  configurationId: cfg.id,
  providerProblemId: 'test',
  name: 'Test',
  rating: null,
  grade: makeGrade('font', '6A'),
  holds: [{ holdId: '1', role: 'start', ledPosition: 42, ledColor: '00FF00' }],
} as const;
function session(t: SlowTransport) {
  return new BoardSession(
    controllerLookup(createControllers('live', t)),
    new FixedClock(new Date('2026-11-17T10:00:00Z')),
    new RingDiagnosticsSink(),
  );
}

it('FR-003/008: the last explicit controller choice wins even when the earlier native connect finishes late', async () => {
  const t = new SlowTransport(),
    s = session(t);
  const first = s.connect(a, cfg);
  await t.started.promise;
  const second = s.connect(b, cfg);
  t.b.resolve({ ok: true });
  t.a.resolve({ ok: true });
  expect(await first).toMatchObject({ ok: false });
  expect(await second).toMatchObject({ ok: true });
  expect(s.snapshot()).toMatchObject({ connection: 'connected', board: { id: 'B' } });
  expect(t.writes).toEqual([]);
  expect(await s.lightUp({ ...problem, holds: [...problem.holds] })).toEqual({ ok: true, confirmed: false });
  expect(t.writes.map((w) => ({ id: w.deviceId, bytes: [...w.frame] }))).toEqual([
    { id: 'B', bytes: [1, 4, 101, 2, 84, 42, 0, 28, 3] },
  ]);
});
it('FR-003/017: disconnect during pending connect cannot resurrect a link', async () => {
  const t = new SlowTransport(),
    s = session(t);
  const first = s.connect(a, cfg);
  await t.started.promise;
  await s.disconnect();
  t.a.resolve({ ok: true });
  await first;
  expect(s.snapshot()).toMatchObject({ connection: 'idle', board: null });
  expect(await s.lightUp({ ...problem, holds: [...problem.holds] })).toMatchObject({
    ok: false,
    code: 'not_connected',
  });
  expect(t.writes).toEqual([]);
});
it('FR-003: a later manufacturer selection cannot be replaced by a prior controller completion', async () => {
  const t = new SlowTransport(),
    s = session(t);
  const first = s.connect(a, cfg);
  await t.started.promise;
  const next = s.connect(
    { ...b, manufacturer: 'tension', name: 'Tension Board@2' },
    { ...cfg, manufacturer: 'tension', id: 'bs-9-1-40' },
  );
  t.b.resolve({ ok: true });
  t.a.resolve({ ok: true });
  await first;
  expect(await next).toMatchObject({ ok: true });
  expect(s.snapshot()).toMatchObject({
    connection: 'connected',
    board: { id: 'B', manufacturer: 'tension' },
  });
  expect(t.writes).toEqual([]);
});

class HeldWrite extends ScriptedBleTransport {
  readonly started = deferred<void>();
  readonly finish = deferred<void>();
  override async write(id: string, frame: Uint8Array): Promise<boolean> {
    this.started.resolve();
    await this.finish.promise;
    return super.write(id, frame);
  }
}

it.each(['switch', 'disconnect'] as const)(
  'FR-009: %s during an in-flight command clears pending feedback and allows a later explicit command',
  async (action) => {
    const t = new HeldWrite();
    const s = new BoardSession(
      controllerLookup(createControllers('live', t)),
      new FixedClock(new Date('2026-11-17T10:00:00Z')),
      new RingDiagnosticsSink(),
    );
    await s.connect(a, cfg);
    const prior = s.lightUp({ ...problem, holds: [...problem.holds] });
    await t.started.promise;
    if (action === 'switch') await s.connect(b, cfg);
    else await s.disconnect();
    expect(s.snapshot().command.state).not.toBe('pending');
    t.finish.resolve();
    expect(await prior).toMatchObject({ ok: false, code: 'not_connected' });
    expect(s.snapshot().command.state).not.toBe('pending');
    if (action === 'disconnect') await s.connect(b, cfg);
    expect(await s.lightUp({ ...problem, holds: [...problem.holds] })).toEqual({
      ok: true,
      confirmed: false,
    });
    expect(s.snapshot().command.state).toBe('sent');
    expect(t.writes.at(-1)?.deviceId).toBe('B');
  },
);
