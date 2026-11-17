import { afterAll, expect, it, mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
  copyFileSync,
  renameSync,
  unlinkSync,
  readdirSync,
  rmSync,
  openSync,
  readSync,
  writeSync,
  closeSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'fflate';

const directory = mkdtempSync(join(tmpdir(), 'boardclimb-native-snapshot-'));
const fixture = readFileSync(
  join(import.meta.dir, '../../../../packages/provider-snapshots/fixtures/kilter.db'),
);
const compressed = gzipSync(fixture);
let builtAt = '2026-11-17T07:00:00Z';
let downloadFails = false;
const handles: { db: Database; closed: boolean; file: string }[] = [];
class TestDirectory {
  readonly uri: string;
  constructor(...parts: (string | TestDirectory)[]) {
    this.uri = join(...parts.map((p) => (typeof p === 'string' ? p : p.uri)));
  }
  create() {
    mkdirSync(this.uri, { recursive: true });
  }
  list() {
    return readdirSync(this.uri).map((name) => new TestFile(this, name));
  }
}
class TestFile {
  readonly uri: string;
  constructor(parent: TestDirectory, name: string) {
    this.uri = join(parent.uri, name);
  }
  get name() {
    return this.uri.split('/').at(-1)!;
  }
  get exists() {
    return existsSync(this.uri);
  }
  get size() {
    return statSync(this.uri).size;
  }
  async text() {
    return readFileSync(this.uri, 'utf8');
  }
  create() {
    writeFileSync(this.uri, new Uint8Array());
  }
  write(text: string) {
    writeFileSync(this.uri, text);
  }
  delete() {
    unlinkSync(this.uri);
  }
  copy(dest: TestFile) {
    copyFileSync(this.uri, dest.uri);
  }
  move(dest: TestFile) {
    renameSync(this.uri, dest.uri);
  }
  open(mode: string) {
    const fd = openSync(this.uri, mode === 'r' ? 'r' : 'r+');
    const path = this.uri;
    return {
      offset: 0,
      get size() {
        return statSync(path).size;
      },
      async readBytes(length: number) {
        const data = Buffer.alloc(length);
        const n = readSync(fd, data, 0, length, this.offset);
        this.offset += n;
        return new Uint8Array(data.subarray(0, n));
      },
      writeBytesSync(data: Uint8Array) {
        writeSync(fd, data, 0, data.length, this.offset);
        this.offset += data.length;
      },
      close() {
        closeSync(fd);
      },
    };
  }
  static async downloadFileAsync(_url: string, dest: TestFile) {
    if (downloadFails) throw new Error('offline');
    writeFileSync(dest.uri, compressed);
    return dest;
  }
}
mock.module('expo-file-system', () => ({
  Directory: TestDirectory,
  File: TestFile,
  FileMode: { ReadOnly: 'r', ReadWrite: 'rw' },
  Paths: { document: directory, availableDiskSpace: 1024 * 1024 * 1024 },
}));
mock.module('expo/fetch', () => ({
  fetch: async () => ({
    ok: true,
    json: async () => ({
      formatVersion: 2,
      entries: [
        {
          boardType: 'kilter',
          layoutId: 1,
          privacyVersion: 1,
          url: `https://snapshots.boardsesh.com/board-snapshots/v1-gzip/kilter/1/${Date.parse(builtAt)}.db`,
          builtAt,
          bytes: compressed.length,
          uncompressedBytes: fixture.length,
        },
      ],
    }),
  }),
}));
mock.module('expo-sqlite', () => ({
  openDatabaseAsync: async (filename: string, _options: unknown, path: string) => {
    const db = new Database(join(path, filename));
    const state = { db, closed: false, file: filename };
    handles.push(state);
    return {
      getAllAsync: async <T>(sql: string, params: readonly (string | number | null)[] = []) =>
        db.query(sql).all(...params) as T[],
      getFirstAsync: async <T>(sql: string) => db.query(sql).get() as T,
      closeAsync: async () => {
        db.close();
        state.closed = true;
      },
    };
  },
}));
const { DeviceSnapshotReader } = await import('./DeviceSnapshotReader');
afterAll(() => {
  for (const h of handles) if (!h.closed) h.db.close();
  rmSync(directory, { recursive: true, force: true });
});
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

it('FR-006: gzip install is validated, old reads survive refresh, retired handles close and completed files are bounded', async () => {
  let now = Date.parse('2026-11-17T08:00:00Z');
  const reader = new DeviceSnapshotReader(() => now);
  const old = await reader.open('kilter', 1);
  expect(
    (await old.all<{ uuid: string }>('SELECT uuid FROM board_climbs LIMIT 1', []))[0]?.uuid,
  ).toBeTruthy();
  for (const day of [18, 19, 20]) {
    builtAt = `2026-11-${day}T07:00:00Z`;
    now = Date.parse(`2026-11-${day}T08:00:00Z`);
    const current = await reader.open('kilter', 1);
    await current.release?.();
    // Fake native I/O is synchronous underneath promises; one event-loop turn drains installation.
    await tick();
  }
  expect((await old.all<{ uuid: string }>('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await old.release?.();
  await tick();
  const files = readdirSync(join(directory, 'catalog-snapshots')).filter((n) => n.endsWith('.db'));
  expect(files).toHaveLength(2);
  expect(
    files.every(
      (f) =>
        f.includes(String(Date.parse('2026-11-19T07:00:00Z'))) ||
        f.includes(String(Date.parse('2026-11-20T07:00:00Z'))),
    ),
  ).toBe(true);
  expect(handles.filter((h) => !h.closed)).toHaveLength(1);
  const last = await reader.open('kilter', 1);
  expect((await last.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await last.release?.();
});
it('FR-006/015: failed refresh keeps completed files and a fresh reader can reopen offline after an incomplete install', async () => {
  downloadFails = true;
  builtAt = '2026-11-21T07:00:00Z';
  writeFileSync(join(directory, 'catalog-snapshots', 'kilter-1-incomplete.staged'), 'broken');
  const reader = new DeviceSnapshotReader(() => Date.parse('2026-11-21T08:00:00Z'));
  const connection = await reader.open('kilter', 1);
  expect((await connection.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await connection.release?.();
  await tick();
  expect(
    readdirSync(join(directory, 'catalog-snapshots')).filter((n) => n.endsWith('.complete')),
  ).toHaveLength(2);
  downloadFails = false;
});

it('FR-006: concurrent cold recovery shares one installed handle and retires any refresh replacement', async () => {
  builtAt = '2026-11-20T07:00:00Z';
  const before = handles.filter((h) => !h.closed).length;
  const reader = new DeviceSnapshotReader(() => Date.parse('2026-11-20T08:00:00Z'));
  const [a, b] = await Promise.all([reader.open('kilter', 1), reader.open('kilter', 1)]);
  expect((await a.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  expect((await b.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await a.release?.();
  await b.release?.();
  await tick();
  expect(handles.filter((h) => !h.closed)).toHaveLength(before + 1);
});
