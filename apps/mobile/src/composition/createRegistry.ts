import { AuroraLedEncoder } from '@boardclimb/protocol-aurora';
import type { ProviderSource } from '@boardclimb/catalog-core';
import { createKilterController, matchKilterDevice } from '@boardclimb/board-kilter';
import {
  createMoonBoardController,
  matchMoonBoardDevice,
  MoonBoardLedEncoder,
} from '@boardclimb/board-moonboard';
import { createTensionController, matchTensionDevice } from '@boardclimb/board-tension';
import type { ControllerLookup } from '@boardclimb/application';
import { ScriptedBleTransport, sampleDeviceMatcher, sampleLedEncoder } from '@boardclimb/bluetooth-core';
import type { BleTransport, BoardController } from '@boardclimb/bluetooth-core';
import type { BoardCatalog } from '@boardclimb/catalog-core';
import { createKilterCatalog, createSampleKilterSource } from '@boardclimb/catalog-kilter';
import { createMoonBoardCatalog, createSampleMoonBoardSource } from '@boardclimb/catalog-moonboard';
import { createSampleTensionSource, createTensionCatalog } from '@boardclimb/catalog-tension';
import type { Manufacturer } from '@boardclimb/domain';

export type Mode = 'sample' | 'unverified' | 'live';

/** One catalog per manufacturer. Unverified mode uses the real adapters with no verified source (they say so). */
export function createCatalogs(
  mode: Mode,
  sources?: Record<Manufacturer, ProviderSource>,
): Record<Manufacturer, BoardCatalog> {
  return mode === 'sample'
    ? {
        kilter: createKilterCatalog(createSampleKilterSource()),
        moonboard: createMoonBoardCatalog(createSampleMoonBoardSource()),
        tension: createTensionCatalog(createSampleTensionSource()),
      }
    : {
        kilter: createKilterCatalog(sources?.kilter),
        moonboard: createMoonBoardCatalog(sources?.moonboard),
        tension: createTensionCatalog(sources?.tension),
      };
}

/** One controller per manufacturer over the given radio. Sample mode adds the labelled sample matcher and encoder. */
export function createControllers(
  mode: Mode,
  transport: BleTransport,
): Record<Manufacturer, BoardController> {
  if (mode === 'live')
    return {
      kilter: createKilterController(transport, {
        matcher: matchKilterDevice,
        encoder: new AuroraLedEncoder(),
      }),
      tension: createTensionController(transport, {
        matcher: matchTensionDevice,
        encoder: new AuroraLedEncoder(),
      }),
      moonboard: createMoonBoardController(transport, {
        matcher: matchMoonBoardDevice,
        encoder: new MoonBoardLedEncoder(),
      }),
    };
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
