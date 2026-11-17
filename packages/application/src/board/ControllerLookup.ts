import type { BoardController } from '@boardclimb/bluetooth-core';
import type { Manufacturer } from '@boardclimb/domain';

/** Finds the controller for a manufacturer. Built once in the composition root (CODE.8). */
export type ControllerLookup = (manufacturer: Manufacturer) => BoardController;
