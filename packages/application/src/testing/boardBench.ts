import {
  ScriptedBleTransport,
  TransportBoardController,
  sampleDeviceMatcher,
  sampleLedEncoder,
} from '@boardclimb/bluetooth-core';
import { makeProblemKey } from '@boardclimb/domain';
import type { BoardConfiguration, Manufacturer, Problem } from '@boardclimb/domain';
import { BoardSession } from '../board/BoardSession';
import { FixedClock } from './FixedClock';
import { RecordingDiagnostics } from './RecordingDiagnostics';

export const KILTER_CONFIG: BoardConfiguration = {
  id: 'cfg',
  boardId: 'b',
  manufacturer: 'kilter',
  name: 'Sample',
  angleDegrees: 40,
};

export function problem(id = 'p-1', manufacturer: Manufacturer = 'kilter'): Problem {
  return {
    key: makeProblemKey(manufacturer, 'cfg', id),
    manufacturer,
    configurationId: 'cfg',
    providerProblemId: id,
    name: `Problem ${id}`,
    grade: { system: 'v', label: 'V3', difficulty: 5 },
    rating: null,
    holds: [
      { holdId: 'h1', role: 'start' },
      { holdId: 'h2', role: 'finish' },
    ],
  };
}

export function bench(manufacturer: Manufacturer = 'kilter') {
  const transport = new ScriptedBleTransport();
  transport.devices = [{ id: 'dev-1', name: `Sample ${manufacturer} Board` }];
  const controller = new TransportBoardController({
    manufacturer,
    transport,
    matcher: sampleDeviceMatcher(manufacturer, 'cfg'),
    encoder: sampleLedEncoder,
    capabilities: {
      simultaneousConnections: 'unknown',
      ledStateReadback: 'unknown',
      canIdentifyConfiguration: false,
    },
  });
  const diagnostics = new RecordingDiagnostics();
  const clock = new FixedClock(new Date('2026-11-16T10:00:00Z'));
  const session = new BoardSession(() => controller, clock, diagnostics);
  return { transport, controller, diagnostics, clock, session };
}
