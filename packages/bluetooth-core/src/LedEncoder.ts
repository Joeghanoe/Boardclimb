import type { BoardConfiguration, Problem } from '@boardclimb/domain';

/**
 * Turns a problem's holds into the bytes a controller expects. Vendor specific and unverified until a spike
 * ends with a physical-board test (ADR-0002 section 7). Returns null when no verified encoding exists.
 */
export interface LedEncoder {
  encode(
    problem: Problem,
    configuration: BoardConfiguration,
    deviceName?: string | null,
  ): Uint8Array[] | null;
}
