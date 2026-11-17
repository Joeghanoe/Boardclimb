import type { ScriptedBleTransport } from '@boardclimb/bluetooth-core';
import { FixedClock, SequentialIds } from '@boardclimb/application/testing';
import type { BoardSelection } from '@boardclimb/application';
import type { BoardConfiguration } from '@boardclimb/domain';
import type { SqlDatabase } from '@boardclimb/storage-local';
import { createAppContainer } from '../../apps/mobile/src/composition/createAppContainer';
import { createSampleTransport } from '../../apps/mobile/src/composition/createRegistry';
import type { Mode } from '../../apps/mobile/src/composition/createRegistry';

export interface WorldOptions {
  database?: SqlDatabase | null;
  mode?: Mode;
  transport?: ScriptedBleTransport;
  clock?: FixedClock;
  ids?: SequentialIds;
  pageSize?: number;
}

/** The real composition root over fakes for time, ids and the radio, as the scenario tests drive the app. */
export async function openWorld(options: WorldOptions = {}) {
  const transport = options.transport ?? createSampleTransport();
  const clock = options.clock ?? new FixedClock(new Date('2026-11-16T10:00:00Z'));
  const ids = options.ids ?? new SequentialIds();
  const container = await createAppContainer({
    database: options.database ?? null,
    transport,
    clock,
    ids,
    mode: options.mode ?? 'sample',
    ...(options.pageSize === undefined ? {} : { pageSize: options.pageSize }),
  });
  return { container, transport, clock, ids };
}

export type World = Awaited<ReturnType<typeof openWorld>>;

/** Picks the first layout of a manufacturer from the directory, as a climber choosing a board would. */
export async function firstLayout(
  world: World,
  manufacturer: BoardConfiguration['manufacturer'],
): Promise<BoardSelection> {
  const entries = await world.container.directory.list();
  const entry = entries.find((candidate) => candidate.manufacturer === manufacturer);
  if (!entry?.ok) throw new Error(`no layouts for ${manufacturer}`);
  const first = entry.boards[0];
  const configuration = first?.configurations[0];
  if (!first || !configuration) throw new Error(`no layout for ${manufacturer}`);
  return { boardName: first.board.name, configuration };
}
