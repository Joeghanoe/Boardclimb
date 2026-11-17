import { describe, expect, it } from 'bun:test';
import { DIAGNOSTIC_EVENT_NAMES, DIAGNOSTIC_FIELDS } from '@boardclimb/application';
import { BOARD_ERROR_CODES } from '@boardclimb/bluetooth-core';
import { CATALOG_ERROR_CODES } from '@boardclimb/catalog-core';
import { LOG_ERROR_CODES } from '@boardclimb/domain';
import { STORAGE_ERROR_CODES } from '@boardclimb/storage-local';
import { packageFolders, readText } from './sourceFiles';

const design = await readText('docs/solution-design.md');

function section(title: string): string {
  const start = design.indexOf(`## ${title}`);
  const next = design.indexOf('\n## ', start + 1);
  return design.slice(start, next === -1 ? undefined : next);
}

describe('the design says what the code does (DEL.4, CODE.7)', () => {
  it.each([
    ['catalog', CATALOG_ERROR_CODES],
    ['bluetooth', BOARD_ERROR_CODES],
    ['log', LOG_ERROR_CODES],
    ['storage', STORAGE_ERROR_CODES],
  ])('lists every %s error code in the failure model', (_area, codes) => {
    const failure = section('Failure model');
    for (const code of codes) expect(failure, code).toContain(code);
  });

  it('lists every diagnostic event in the observability contract', () => {
    const observability = section('Observability contract');
    for (const name of DIAGNOSTIC_EVENT_NAMES) expect(observability, name).toContain(name);
  });

  it('keeps personal and hardware identifiers out of the diagnostics allow-list (SEC.2)', () => {
    for (const forbidden of ['problemKey', 'name', 'deviceId', 'address', 'message', 'holds']) {
      if (forbidden === 'name') continue; // `name` is the event name, not a problem name
      expect(DIAGNOSTIC_FIELDS).not.toContain(forbidden);
    }
  });

  it('describes every package in the components table', () => {
    const components = section('Components');
    for (const folder of packageFolders()) expect(components, folder).toContain(folder);
  });
});
