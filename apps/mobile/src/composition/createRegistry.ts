import { createKilterController } from '@boardclimb/board-kilter';
import { createMoonBoardController } from '@boardclimb/board-moonboard';
import { createTensionController } from '@boardclimb/board-tension';
import type { ControllerLookup } from '@boardclimb/application';
import { ScriptedBleTransport, sampleDeviceMatcher, sampleLedEncoder } from '@boardclimb/bluetooth-core';
import type { BleTransport, BoardController } from '@boardclimb/bluetooth-core';
import type { BoardCatalog } from '@boardclimb/catalog-core';
import { createKilterCatalog, createSampleKilterSource } from '@boardclimb/catalog-kilter';
import { createMoonBoardCatalog, createSampleMoonBoardSource } from '@boardclimb/catalog-moonboard';
import { createSampleTensionSource, createTensionCatalog } from '@boardclimb/catalog-tension';
import type { Manufacturer } from '@boardclimb/domain';

export type Mode = 'sample' | 'unverified';

/** One catalog per manufacturer. Unverified mode uses the real adapters with no verified source (they say so). */
export function createCatalogs(mode: Mode): Record<Manufacturer, BoardCatalog> {
  return mode === 'sample'
    ? {
        kilter: createKilterCatalog(createSampleKilterSource()),
        moonboard: createMoonBoardCatalog(createSampleMoonBoardSource()),
        tension: createTensionCatalog(createSampleTensionSource()),
      }
    : {
        kilter: createKilterCatalog(),
        moonboard: createMoonBoardCatalog(),
        tension: createTensionCatalog(),
      };
}

/** One controller per manufacturer over the given radio. Sample mode adds the labelled sample matcher and encoder. */
export function createControllers(
  mode: Mode,
  transport: BleTransport,
): Record<Manufacturer, BoardController> {
  const sample = (manufacturer: Manufacturer) =>
    mode === 'sample' ? { matcher: sampleDeviceMatcher(manufacturer, null), encoder: sampleLedEncoder } : {};
  return {
    kilter: createKilterController(transport, sample('kilter')),
    moonboard: createMoonBoardController(transport, sample('moonboard')),
    tension: createTensionController(transport, sample('tension')),
  };
}

export function lookup<T>(registry: Record<Manufacturer, T>): (manufacturer: Manufacturer) => T {
  return (manufacturer) => registry[manufacturer];
}

export function controllerLookup(registry: Record<Manufacturer, BoardController>): ControllerLookup {
  return lookup(registry);
}

/** The scripted radio of sample mode: three made-up boards nearby, always reachable. Not real hardware. */
export function createSampleTransport(): ScriptedBleTransport {
  const transport = new ScriptedBleTransport();
  transport.devices = [
    { id: 'sample-kilter', name: 'Sample Kilter Board' },
    { id: 'sample-moonboard', name: 'Sample MoonBoard' },
    { id: 'sample-tension', name: 'Sample Tension Board' },
  ];
  return transport;
}
