import type { BoardConfiguration, Problem } from '@boardclimb/domain';
import type { LedEncoder } from '@boardclimb/bluetooth-core';

/** Adapted from Boardsesh moonboard.ts at c788005; Apache-2.0. No clear or V2-neighbour commands. */
export class MoonBoardLedEncoder implements LedEncoder {
  encode(problem: Problem, configuration: BoardConfiguration): Uint8Array[] | null {
    const rows = /^bs-(6|7)-/.test(configuration.id) ? 12 : 18;
    const roles: Record<string, string> = { start: 'S', hand: 'P', finish: 'E' };
    if (!problem.holds.length) return null;
    const holds: string[] = [];
    for (const hold of problem.holds) {
      const id = Number(hold.holdId);
      const role = roles[hold.role];
      if (!role || !Number.isInteger(id) || id < 1 || id > 11 * rows) return null;
      const col = (id - 1) % 11,
        row = Math.floor((id - 1) / 11);
      holds.push(`${role}${col * rows + (col % 2 === 0 ? row : rows - 1 - row)}`);
    }
    return [Uint8Array.from(Array.from(`l#${holds.join(',')}#`, (c) => c.charCodeAt(0)))];
  }
}
