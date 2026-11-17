import type { Manufacturer } from '@boardclimb/domain';

/**
 * What diagnostics may record (OBS.3, SEC.2): names, counts, codes, durations. Never problem names, history,
 * hardware addresses, payloads or free text. `DIAGNOSTIC_FIELDS` is the allow-list a test enforces.
 */
export type DiagnosticEvent =
  | { name: 'board.discovered'; manufacturer: Manufacturer; count: number }
  | {
      name: 'board.connection_changed';
      manufacturer: Manufacturer;
      from: string;
      to: string;
      code: string | null;
      ms: number;
    }
  | { name: 'board.command_result'; manufacturer: Manufacturer; ok: boolean; code: string | null; ms: number }
  | {
      name: 'catalog.sync_result';
      manufacturer: Manufacturer;
      fetched: number;
      skipped: number;
      code: string | null;
      ms: number;
    }
  | { name: 'storage.migrated'; from: number; to: number };

export const DIAGNOSTIC_FIELDS: readonly string[] = [
  'name',
  'manufacturer',
  'count',
  'from',
  'to',
  'code',
  'ms',
  'ok',
  'fetched',
  'skipped',
];

const EVENT_NAMES = {
  'board.discovered': true,
  'board.connection_changed': true,
  'board.command_result': true,
  'catalog.sync_result': true,
  'storage.migrated': true,
} satisfies Record<DiagnosticEvent['name'], true>;

/** Every event name, kept in step with the union above at compile time and with the design by a test. */
export const DIAGNOSTIC_EVENT_NAMES = Object.keys(EVENT_NAMES) as DiagnosticEvent['name'][];
