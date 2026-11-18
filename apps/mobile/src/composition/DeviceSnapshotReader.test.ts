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

const MIRROR = 'https://catalog.example.org';
const MANIFESTS = [
  `${MIRROR}/board-snapshots/v1-gzip/manifest.json`,
  'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json',
];
const directory = mkdtempSync(join(tmpdir(), 'boardclimb-native-snapshot-'));
const fixture = readFileSync(
  join(import.meta.dir, '../../../../packages/provider-snapshots/fixtures/kilter.db'),
);
const compressed = gzipSync(fixture);
let builtAt = '2026-11-17T07:00:00Z';
let downloadFails = false;
let decodedDownload = false;
let mirrorDown = false;
const downloadedFrom: string[] = [];
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
  uri: string;
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
  async copy(dest: TestFile) {
    await Promise.resolve();
    copyFileSync(this.uri, dest.uri);
  }
  async move(dest: TestFile) {
    await Promise.resolve();
    renameSync(this.uri, dest.uri);
    this.uri = dest.uri;
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
  static async downloadFileAsync(url: string, dest: TestFile) {
    if (downloadFails) throw new Error('offline');
    downloadedFrom.push(new URL(url).origin);
    writeFileSync(dest.uri, decodedDownload ? fixture : compressed);
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
  fetch: async (manifestUrl: string) => ({
    ok: !(mirrorDown && manifestUrl.startsWith(MIRROR)),
    json: async () => ({
      formatVersion: 2,
      entries: [
        {
          boardType: 'kilter',
          layoutId: 1,
          privacyVersion: 1,
          url: `${new URL(manifestUrl).origin}/board-snapshots/v1-gzip/kilter/1/${Date.parse(builtAt)}.db`,
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
      execAsync: async (sql: string) => {
        db.run(sql);
      },
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

it('FR-006: an HTTP-decoded SQLite download finishes copying before validation and survives installation cleanup', async () => {
  decodedDownload = true;
  builtAt = '2026-11-22T07:00:00Z';
  const reader = new DeviceSnapshotReader(() => Date.parse('2026-11-22T08:00:00Z'));
  const old = await reader.open('kilter', 1);
  await old.release?.();
  await tick();
  const filename = `kilter-1-${Date.parse(builtAt)}.db`;
  // The whole download arrived (every climb), and the browse index was added before it was marked complete.
  const installedFile = new Database(join(directory, 'catalog-snapshots', filename), { readonly: true });
  const original = new Database(
    join(import.meta.dir, '../../../../packages/provider-snapshots/fixtures/kilter.db'),
    { readonly: true },
  );
  const climbs = (db: Database) => db.query('SELECT uuid FROM board_climbs ORDER BY uuid').all();
  expect(climbs(installedFile)).toEqual(climbs(original));
  expect(
    installedFile
      .query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'boardclimb_browse'")
      .all(),
  ).toHaveLength(1);
  installedFile.close();
  original.close();
  downloadFails = true;
  const restarted = new DeviceSnapshotReader(() => Date.parse('2026-11-22T08:00:00Z'));
  const installed = await restarted.open('kilter', 1);
  expect((await installed.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await installed.release?.();
  await tick();
  downloadFails = false;
  decodedDownload = false;
});

it('FR-006: a catalog downloaded before filtered browsing gets the browse index when it is opened', async () => {
  const snapshots = join(directory, 'catalog-snapshots');
  const filename = 'tension-1-1000.db';
  copyFileSync(
    join(import.meta.dir, '../../../../packages/provider-snapshots/fixtures/kilter.db'),
    join(snapshots, filename),
  );
  writeFileSync(join(snapshots, `${filename}.complete`), filename);
  const browseIndex = (file: string) => {
    const db = new Database(file, { readonly: true });
    const found = db
      .query("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'boardclimb_browse'")
      .all();
    db.close();
    return found;
  };
  expect(browseIndex(join(snapshots, filename))).toHaveLength(0);
  downloadFails = true;
  const reader = new DeviceSnapshotReader(() => Date.parse('2026-11-23T08:00:00Z'));
  const connection = await reader.open('tension', 1);
  expect(browseIndex(join(snapshots, filename))).toHaveLength(1);
  await connection.release?.();
  await tick();
  downloadFails = false;
});

it('FR-006/ADR-0006: phones install from the mirror first and fall back to BoardSesh when it is down', async () => {
  downloadedFrom.length = 0;
  builtAt = '2026-11-24T07:00:00Z';
  const fromMirror = await new DeviceSnapshotReader(() => Date.parse('2026-11-24T08:00:00Z'), MANIFESTS).open(
    'kilter',
    1,
  );
  expect((await fromMirror.all('SELECT uuid FROM board_climbs LIMIT 1', [])).length).toBe(1);
  await fromMirror.release?.();
  await tick();
  mirrorDown = true;
  builtAt = '2026-11-25T07:00:00Z';
  // The installed catalog opens at once; the daily refresh runs in the background and must reach BoardSesh.
  const fromBoardSesh = await new DeviceSnapshotReader(
    () => Date.parse('2026-11-25T08:00:00Z'),
    MANIFESTS,
  ).open('kilter', 1);
  await fromBoardSesh.release?.();
  await tick();
  await tick();
  mirrorDown = false;
  expect(downloadedFrom).toEqual([MIRROR, 'https://snapshots.boardsesh.com']);
});
