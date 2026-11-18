import { describe, expect, it } from 'bun:test';
import { ScriptedBleTransport, sampleDeviceMatcher, sampleLedEncoder } from '@boardclimb/bluetooth-core';
import { runBoardControllerContract } from '@boardclimb/bluetooth-core/testing';
import { createMoonBoardController } from '@boardclimb/board-moonboard';

const configuration = {
  id: 'sample-moonboard-set-a',
  boardId: 'sample-moonboard',
  manufacturer: 'moonboard',
  name: 'Sample hold set A',
  angleDegrees: 40,
} as const;

runBoardControllerContract('MoonBoard controller over a scripted radio (AC-015, AC-018)', () => {
  const transport = new ScriptedBleTransport();
  transport.devices = [{ id: 'dev-1', name: 'Sample MoonBoard' }];
  return {
    transport,
    configuration,
    controller: createMoonBoardController(transport, {
      matcher: sampleDeviceMatcher('moonboard', configuration.id),
      encoder: sampleLedEncoder,
    }),
  };
});

describe('MoonBoard controller with no verified protocol', () => {
  it('recognises no device by default (A1, A5)', async () => {
    const transport = new ScriptedBleTransport();
    transport.devices = [{ id: 'dev-1', name: 'MoonBoard 1234' }];
    expect(await createMoonBoardController(transport).discover()).toEqual([]);
  });
});
