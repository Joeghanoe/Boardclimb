import { describe, expect, it } from 'bun:test';
import type { ScriptedBleTransport } from '@boardclimb/bluetooth-core';
import { defaultProblemFilters } from '@boardclimb/domain';
import { createSampleTransport } from '../../apps/mobile/src/composition/createRegistry';
import { firstLayout, openWorld } from './world';

describe('Bluetooth permission denied or radio off (acceptance 10, FR-004, FR-016)', () => {
  function transportWith(change: (transport: ScriptedBleTransport) => void): ScriptedBleTransport {
    const transport = createSampleTransport();
    change(transport);
    return transport;
  }

  const cases: { name: string; change: (transport: ScriptedBleTransport) => void; code: string }[] = [
    {
      name: 'permission denied',
      change: (transport) => {
        transport.permission = 'denied';
      },
      code: 'bluetooth_permission_denied',
    },
    {
      name: 'radio off',
      change: (transport) => {
        transport.radio = 'off';
      },
      code: 'bluetooth_disabled',
    },
  ];

  it.each(cases)(
    '$name: browsing, opening and logging still work and the reason is reported',
    async ({ change, code }) => {
      const world = await openWorld({ transport: transportWith(change) });
      const { container } = world;
      const selection = await firstLayout(world, 'kilter');

      const page = await container.browser.browse(selection.configuration, defaultProblemFilters, null);
      const summary = page.items[0];
      if (!summary) throw new Error('fixture');
      const problem = await container.browser.getProblem(selection.configuration, summary);
      expect((await container.log.addAttempt(problem.key)).ok).toBe(true);
      expect((await container.log.setTop(problem.key, true)).ok).toBe(true);

      expect(await container.session.discover('kilter')).toMatchObject({ ok: false, code });
      expect(await container.session.lightUp(problem)).toMatchObject({ ok: false, code: 'not_connected' });
      expect(world.transport.writeCount).toBe(0);
    },
  );

  it('asks for permission only when the climber starts a Bluetooth action (FR-016)', async () => {
    const world = await openWorld({});
    const selection = await firstLayout(world, 'kilter');
    await world.container.browser.browse(selection.configuration, defaultProblemFilters, null);
    await world.container.log.addAttempt((await firstProblem(world, selection)).key);
    expect(world.transport.calls).toEqual([]);
    await world.container.session.discover('kilter');
    expect(world.transport.calls[0]).toBe('requestPermission');
  });
});

async function firstProblem(
  world: Awaited<ReturnType<typeof openWorld>>,
  selection: Awaited<ReturnType<typeof firstLayout>>,
) {
  const page = await world.container.browser.browse(selection.configuration, defaultProblemFilters, null);
  const summary = page.items[0];
  if (!summary) throw new Error('fixture');
  return summary;
}
