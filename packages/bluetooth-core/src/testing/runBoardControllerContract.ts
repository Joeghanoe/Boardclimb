import { describe, expect, it } from 'bun:test';
import { makeProblemKey } from '@boardclimb/domain';
import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import type { BoardController } from '../board/BoardController';
import type { ScriptedBleTransport } from '../bluetooth/ScriptedBleTransport';

export interface BoardControllerContractSubject {
  controller: BoardController;
  /** The scripted radio the controller was built over; it already lists one recognisable sample board. */
  transport: ScriptedBleTransport;
  configuration: BoardConfiguration;
}

function problemFor(manufacturer: Manufacturer, configuration: BoardConfiguration): Problem {
  return {
    key: makeProblemKey(manufacturer, configuration.id, 'p-1'),
    manufacturer,
    configurationId: configuration.id,
    providerProblemId: 'p-1',
    name: 'Contract problem',
    grade: { system: 'font', label: '6A', difficulty: 5 },
    rating: null,
    holds: [
      { holdId: 'h1', role: 'start' },
      { holdId: 'h2', role: 'finish' },
    ],
  };
}

/**
 * The shared controller contract (AC-013, AC-015, AC-018): the same promises for every manufacturer.
 * It runs against a scripted radio; physical-board behaviour is verified separately (ADR-0002 A1, A4, A7).
 */
export function runBoardControllerContract(name: string, create: () => BoardControllerContractSubject): void {
  describe(`${name} satisfies the BoardController contract`, () => {
    it('AC-013: discovery lists boards and neither connects nor writes', async () => {
      const { controller, transport } = create();
      const boards = await controller.discover();
      expect(boards.length).toBeGreaterThan(0);
      for (const board of boards) expect(board.manufacturer).toBe(controller.manufacturer);
      expect(transport.calls.some((call) => call.startsWith('connect') || call.startsWith('write'))).toBe(
        false,
      );
    });

    it('FR-016: reports a denied permission and a switched-off radio as recoverable errors', async () => {
      const { controller, transport } = create();
      transport.permission = 'denied';
      await expect(controller.discover()).rejects.toMatchObject({ code: 'bluetooth_permission_denied' });
      transport.permission = 'granted';
      transport.radio = 'off';
      await expect(controller.discover()).rejects.toMatchObject({ code: 'bluetooth_disabled' });
      transport.radio = 'on';
      transport.scanFails = true;
      await expect(controller.discover()).rejects.toMatchObject({ code: 'scan_failed' });
    });

    it('AC-018: connecting sends no LED command, and neither does reconnecting', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      expect((await controller.connect(board, configuration)).ok).toBe(true);
      transport.simulateDisconnect(board.id);
      expect((await controller.reconnect()).ok).toBe(true);
      expect(transport.writeCount).toBe(0);
    });

    it('AC-1: only an explicit lightUp writes, and it is reported as sent, not confirmed', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      await controller.connect(board, configuration);
      expect(transport.writeCount).toBe(0);
      const result = await controller.lightUp(problemFor(controller.manufacturer, configuration));
      expect(result).toEqual({ ok: true, confirmed: false });
      expect(transport.writeCount).toBeGreaterThan(0);
    });

    it('refuses to light without a connection and without writing', async () => {
      const { controller, transport, configuration } = create();
      const result = await controller.lightUp(problemFor(controller.manufacturer, configuration));
      expect(result).toMatchObject({ ok: false, code: 'not_connected' });
      expect(transport.writeCount).toBe(0);
    });

    it('refuses a problem from another layout and does not write', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      await controller.connect(board, configuration);
      const other = problemFor(controller.manufacturer, { ...configuration, id: 'another-layout' });
      expect(await controller.lightUp(other)).toMatchObject({ ok: false, code: 'unsupported_configuration' });
      expect(transport.writeCount).toBe(0);
    });

    it('does not claim a takeover when the board refuses a second phone (FR-011)', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      transport.connectResult = { ok: false, reason: 'busy' };
      expect(await controller.connect(board, configuration)).toMatchObject({
        ok: false,
        code: 'takeover_unsupported',
      });
      transport.connectResult = { ok: false, reason: 'timeout' };
      expect(await controller.connect(board, configuration)).toMatchObject({ code: 'connection_timeout' });
    });

    it('reports a rejected write instead of pretending the LEDs changed', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      await controller.connect(board, configuration);
      transport.writeResult = false;
      expect(await controller.lightUp(problemFor(controller.manufacturer, configuration))).toMatchObject({
        ok: false,
        code: 'command_rejected',
      });
    });

    it('tells listeners when the link is lost and then needs an explicit reconnect', async () => {
      const { controller, transport, configuration } = create();
      const [board] = await controller.discover();
      if (!board) throw new Error('fixture needs a discoverable board');
      await controller.connect(board, configuration);
      let lost = 0;
      controller.onConnectionLost(() => (lost += 1));
      transport.simulateDisconnect(board.id);
      expect(lost).toBe(1);
      expect(await controller.lightUp(problemFor(controller.manufacturer, configuration))).toMatchObject({
        code: 'not_connected',
      });
    });

    it('models capabilities as unknown rather than assuming multi-phone or readback', () => {
      const { controller } = create();
      expect(controller.getCapabilities()).toMatchObject({
        simultaneousConnections: 'unknown',
        ledStateReadback: 'unknown',
      });
    });
  });
}
