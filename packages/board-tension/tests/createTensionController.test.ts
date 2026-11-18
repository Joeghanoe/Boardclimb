import { describe, expect, it } from 'bun:test';
import { ScriptedBleTransport, sampleDeviceMatcher, sampleLedEncoder } from '@boardclimb/bluetooth-core';
import { runBoardControllerContract } from '@boardclimb/bluetooth-core/testing';
import { createTensionController } from '@boardclimb/board-tension';

const configuration = {
  id: 'sample-tension-mirror',
  boardId: 'sample-tension',
  manufacturer: 'tension',
  name: 'Sample mirror layout',
  angleDegrees: 40,
} as const;

runBoardControllerContract('Tension controller over a scripted radio (AC-015, AC-018)', () => {
  const transport = new ScriptedBleTransport();
  transport.devices = [{ id: 'dev-1', name: 'Sample Tension Board' }];
  return {
    transport,
    configuration,
    controller: createTensionController(transport, {
      matcher: sampleDeviceMatcher('tension', configuration.id),
      encoder: sampleLedEncoder,
    }),
  };
});

describe('Tension controller with no verified protocol', () => {
  it('recognises no device by default (A1, A5)', async () => {
    const transport = new ScriptedBleTransport();
    transport.devices = [{ id: 'dev-1', name: 'Tension Board 1234' }];
    expect(await createTensionController(transport).discover()).toEqual([]);
  });
});
