import {
  TransportBoardController,
  unverifiedDeviceMatcher,
  unverifiedLedEncoder,
} from '@boardclimb/bluetooth-core';
import type { BleTransport, BoardController, DeviceMatcher, LedEncoder } from '@boardclimb/bluetooth-core';

export interface KilterControllerOptions {
  matcher?: DeviceMatcher;
  encoder?: LedEncoder;
}

/**
 * Kilter controller. Recognising the controller and encoding LEDs are unverified (ADR-0002 A1, A5), so by
 * default no device is recognised and `lightUp` answers `protocol_unverified`. Capabilities stay 'unknown'.
 */
export function createKilterController(
  transport: BleTransport,
  { matcher = unverifiedDeviceMatcher, encoder = unverifiedLedEncoder }: KilterControllerOptions = {},
): BoardController {
  return new TransportBoardController({
    manufacturer: 'kilter',
    transport,
    matcher,
    encoder,
    capabilities: {
      simultaneousConnections: 'unknown',
      ledStateReadback: 'unknown',
      canIdentifyConfiguration: false,
    },
  });
}
