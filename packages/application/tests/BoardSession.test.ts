import { describe, expect, it } from 'bun:test';
import type { BoardController } from '@boardclimb/bluetooth-core';
import type { Manufacturer } from '@boardclimb/domain';
import { BoardSession, DIAGNOSTIC_FIELDS } from '@boardclimb/application';
import {
  FixedClock,
  KILTER_CONFIG,
  RecordingDiagnostics,
  bench,
  problem,
} from '@boardclimb/application/testing';

async function connected(manufacturer: Manufacturer = 'kilter') {
  const parts = bench(manufacturer);
  const found = await parts.session.discover(manufacturer);
  if (!found.ok || !found.boards[0]) throw new Error('fixture needs a board');
  await parts.session.connect(found.boards[0], { ...KILTER_CONFIG, manufacturer });
  return parts;
}

describe('connection and command status are reported honestly (FR-009, acceptance 12)', () => {
  it('goes idle, connecting, connected and keeps the LEDs untouched', async () => {
    const { session, transport } = bench();
    const states: string[] = [];
    session.subscribe(() => states.push(session.snapshot().connection));
    const found = await session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    expect(session.snapshot().connection).toBe('idle');
    await session.connect(found.boards[0], KILTER_CONFIG);
    expect(states).toContain('connecting');
    expect(session.snapshot()).toMatchObject({ connection: 'connected', error: null });
    expect(transport.writeCount).toBe(0);
  });

  it('shows a light command as sent, not confirmed, when the controller cannot read LEDs back', async () => {
    const { session } = await connected();
    const statuses: string[] = [];
    session.subscribe(() => statuses.push(session.snapshot().command.state));
    await session.lightUp(problem());
    expect(statuses).toEqual(['pending', 'sent']);
    expect(session.snapshot().command).toMatchObject({ state: 'sent' });
    expect(statuses).not.toContain('confirmed');
  });

  it('shows confirmed only when the controller reports it', async () => {
    const fake: BoardController = {
      manufacturer: 'kilter',
      discover: () => Promise.resolve([]),
      connect: () =>
        Promise.resolve({
          ok: true,
          capabilities: {
            simultaneousConnections: 'unknown',
            ledStateReadback: 'supported',
            canIdentifyConfiguration: false,
          },
        }),
      reconnect: () => Promise.resolve({ ok: false, code: 'not_connected', message: 'n' }),
      getCapabilities: () => ({
        simultaneousConnections: 'unknown',
        ledStateReadback: 'supported',
        canIdentifyConfiguration: false,
      }),
      lightUp: () => Promise.resolve({ ok: true, confirmed: true }),
      disconnect: () => Promise.resolve(),
      onConnectionLost: () => () => undefined,
    };
    const session = new BoardSession(() => fake, new FixedClock(new Date()), new RecordingDiagnostics());
    await session.connect(
      { id: 'x', name: null, manufacturer: 'kilter', detectedConfigurationId: null },
      KILTER_CONFIG,
    );
    await session.lightUp(problem());
    expect(session.snapshot().command.state).toBe('confirmed');
  });

  it('reports a rejected command as failed, never as sent', async () => {
    const { session, transport } = await connected();
    transport.writeResult = false;
    const result = await session.lightUp(problem());
    expect(result).toMatchObject({ ok: false, code: 'command_rejected' });
    expect(session.snapshot().command).toMatchObject({ state: 'failed', code: 'command_rejected' });
  });

  it('says not connected instead of pretending when there is no board', async () => {
    const { session, transport } = bench();
    expect(await session.lightUp(problem())).toMatchObject({ ok: false, code: 'not_connected' });
    expect(session.snapshot().command).toMatchObject({ state: 'failed', code: 'not_connected' });
    expect(transport.writeCount).toBe(0);
  });

  it('keeps the last command visible after the board disconnects', async () => {
    const { session } = await connected();
    await session.lightUp(problem());
    await session.disconnect();
    expect(session.snapshot()).toMatchObject({ connection: 'idle', command: { state: 'sent' } });
  });
});

describe('recoverable Bluetooth states (FR-016, UC-009)', () => {
  it('reports denied permission and a switched-off radio without throwing', async () => {
    const { session, transport } = bench();
    transport.permission = 'denied';
    expect(await session.discover('kilter')).toMatchObject({
      ok: false,
      code: 'bluetooth_permission_denied',
    });
    transport.permission = 'granted';
    transport.radio = 'off';
    expect(await session.discover('kilter')).toMatchObject({ ok: false, code: 'bluetooth_disabled' });
  });

  it('keeps a failed connection visible with its reason and does not claim a takeover', async () => {
    const { session, transport } = bench();
    const found = await session.discover('kilter');
    if (!found.ok || !found.boards[0]) throw new Error('fixture');
    transport.connectResult = { ok: false, reason: 'busy' };
    await session.connect(found.boards[0], KILTER_CONFIG);
    expect(session.snapshot()).toMatchObject({
      connection: 'failed',
      error: { code: 'takeover_unsupported' },
    });
  });
});

describe('lost links and foreground resume never change the LEDs (FR-017, acceptance 2)', () => {
  it('marks the link lost, reconnects on resume, and sends nothing', async () => {
    const { session, transport } = await connected();
    await session.lightUp(problem());
    const writesBefore = transport.writeCount;

    transport.simulateDisconnect('dev-1');
    expect(session.snapshot().connection).toBe('lost');
    await session.resume();
    expect(session.snapshot().connection).toBe('connected');
    expect(transport.writeCount).toBe(writesBefore);
    expect(session.snapshot().command).toMatchObject({ state: 'sent' });
  });

  it('does nothing on resume when the link is fine', async () => {
    const { session, transport } = await connected();
    const callsBefore = transport.calls.length;
    await session.resume();
    expect(transport.calls.length).toBe(callsBefore);
  });
});

describe('diagnostics (NFR-009, SEC.2)', () => {
  it('records transitions, discovery and command results with allowed fields only', async () => {
    const { session, diagnostics } = await connected();
    await session.lightUp(problem());
    const names = diagnostics.events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining(['board.discovered', 'board.connection_changed', 'board.command_result']),
    );
    for (const event of diagnostics.events) {
      for (const field of Object.keys(event)) expect(DIAGNOSTIC_FIELDS).toContain(field);
    }
    expect(JSON.stringify(diagnostics.events)).not.toContain('dev-1');
    expect(JSON.stringify(diagnostics.events)).not.toContain('Problem');
  });
});
