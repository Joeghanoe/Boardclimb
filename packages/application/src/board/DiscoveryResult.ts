import type { BoardErrorCode, DiscoveredBoard } from '@boardclimb/bluetooth-core';

export type DiscoveryResult =
  { ok: true; boards: DiscoveredBoard[] } | { ok: false; code: BoardErrorCode; message: string };
