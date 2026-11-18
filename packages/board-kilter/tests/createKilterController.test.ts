import { describe, expect, it } from 'bun:test';
import { ScriptedBleTransport, sampleDeviceMatcher, sampleLedEncoder } from '@boardclimb/bluetooth-core';
import { runBoardControllerContract } from '@boardclimb/bluetooth-core/testing';
import { createKilterController } from '@boardclimb/board-kilter';

const configuration = {
  id: 'sample-kilter-12x12',
  boardId: 'sample-kilter-original',
  manufacturer: 'kilter',
  name: 'Sample 12 x 12',
  angleDegrees: 40,
} as const;

runBoardControllerContract('Kilter controller over a scripted radio (AC-015, AC-018)', () => {
  const transport = new ScriptedBleTransport();
  transport.devices = [{ id: 'dev-1', name: 'Sample Kilter Board' }];
  return {
    transport,
    configuration,
    controller: createKilterController(transport, {
      matcher: sampleDeviceMatcher('kilter', configuration.id),
      encoder: sampleLedEncoder,
    }),
  };
});

describe('Kilter controller with no verified protocol', () => {
  it('recognises no device and reports protocol_unverified instead of sending guessed bytes (A1, A5)', async () => {
    const transport = new ScriptedBleTransport();
    transport.devices = [{ id: 'dev-1', name: 'Kilter Board 1234' }];
    const controller = createKilterController(transport);
    expect(await controller.discover()).toEqual([]);

    const result = await controller.connect(
      { id: 'dev-1', name: null, manufacturer: 'kilter', detectedConfigurationId: null },
      configuration,
    );
    expect(result.ok).toBe(true);
    const lit = await controller.lightUp({
      key: 'kilter/sample-kilter-12x12/p-1' as never,
      manufacturer: 'kilter',
      configurationId: configuration.id,
      providerProblemId: 'p-1',
      name: 'x',
      grade: { system: 'v', label: 'V3', difficulty: 5 },
      rating: null,
      holds: [{ holdId: 'h1', role: 'start' }],
    });
    expect(lit).toMatchObject({ ok: false, code: 'protocol_unverified' });
    expect(transport.writeCount).toBe(0);
  });
});
