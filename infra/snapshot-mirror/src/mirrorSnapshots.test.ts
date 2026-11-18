import { beforeEach, describe, expect, it } from 'bun:test';
import { BOARDSESH_SNAPSHOT_MANIFEST, parseSnapshotArtifact } from '@boardclimb/provider-snapshots/manifest';
import type { FetchFile } from './FetchFile';
import type { MirrorBucket, MirrorUpload } from './MirrorBucket';
import { PART_BYTES } from './copyArtifact';
import { mirrorSnapshots } from './mirrorSnapshots';

const SOURCE = 'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/';
const MIRROR = 'https://catalog.example.org';
const MIRROR_MANIFEST = `${MIRROR}/board-snapshots/v1-gzip/manifest.json`;
const MANIFEST_KEY = 'board-snapshots/v1-gzip/manifest.json';
const DAY = 24 * 60 * 60 * 1000;

interface Stored {
  value: Uint8Array;
  uploaded: Date;
  cacheControl: string;
}

/** An in-memory R2 bucket that enforces R2's rule that multipart parts, except the last, share one size. */
class MemoryBucket implements MirrorBucket {
  readonly objects = new Map<string, Stored>();
  aborted = 0;
  constructor(private readonly clock: () => number) {}
  async head(key: string) {
    const object = this.objects.get(key);
    return object ? { size: object.value.length } : null;
  }
  async put(key: string, value: Uint8Array | string, options: { httpMetadata: { cacheControl: string } }) {
    const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
    this.objects.set(key, {
      value: bytes,
      uploaded: new Date(this.clock()),
      cacheControl: options.httpMetadata.cacheControl,
    });
  }
  async createMultipartUpload(key: string, options: { httpMetadata: { cacheControl: string } }) {
    const parts = new Map<number, Uint8Array>();
    const upload: MirrorUpload = {
      uploadPart: async (partNumber, value) => {
        parts.set(partNumber, value.slice());
        return { partNumber, etag: `etag-${partNumber}` };
      },
      complete: async (list) => {
        const sizes = list.map((part) => parts.get(part.partNumber)!.length);
        if (sizes.slice(0, -1).some((size) => size !== sizes[0])) throw new Error('uneven parts');
        await this.put(key, Buffer.concat(list.map((part) => parts.get(part.partNumber)!)), options);
      },
      abort: async () => {
        this.aborted += 1;
      },
    };
    return upload;
  }
  async list(options: { prefix: string; cursor?: string }) {
    const keys = [...this.objects.keys()].filter((key) => key.startsWith(options.prefix)).sort();
    const start = Number(options.cursor ?? 0);
    const page = keys.slice(start, start + 2);
    const truncated = start + 2 < keys.length;
    return {
      objects: page.map((key) => ({ key, uploaded: this.objects.get(key)!.uploaded })),
      truncated,
      ...(truncated ? { cursor: String(start + 2) } : {}),
    };
  }
  async delete(keys: string[]) {
    for (const key of keys) this.objects.delete(key);
  }
  json(key: string) {
    return JSON.parse(new TextDecoder().decode(this.objects.get(key)!.value));
  }
}

const gzipBytes = (length: number, seed: number) => {
  const bytes = new Uint8Array(length).map((_, i) => (i * 31 + seed) % 251);
  bytes.set([0x1f, 0x8b]);
  return bytes;
};
const sqliteBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  bytes.set(new TextEncoder().encode('SQLite format 3\0'));
  return bytes;
};

let now = Date.parse('2026-11-18T08:00:00Z');
let files: Map<string, Uint8Array>;
let served: Map<string, Uint8Array>;
let manifest: { formatVersion: number; generatedAt: string; entries: Record<string, unknown>[] };
let downloads: string[];
let bucket: MemoryBucket;

const entry = (boardType: string, layoutId: number, name: string, extra: Record<string, unknown> = {}) => {
  const url = `${SOURCE}${boardType}/${layoutId}/${name}`;
  const body = files.get(url)!;
  return {
    boardType,
    layoutId,
    key: url.replace('https://snapshots.boardsesh.com/', ''),
    url,
    bytes: body[0] === 0x1f ? body.length : 7,
    uncompressedBytes: body[0] === 0x1f ? body.length * 3 : body.length,
    contentEncoding: 'gzip',
    builtAt: '2026-11-18T07:22:15.685Z',
    schemaVersion: 14,
    privacyVersion: 1,
    ...extra,
  };
};

const fakeFetch: FetchFile = async (url) => {
  if (url === BOARDSESH_SNAPSHOT_MANIFEST) return Response.json(manifest);
  downloads.push(url);
  const body = served.get(url) ?? files.get(url);
  return body ? new Response(body) : new Response('missing', { status: 404 });
};

const run = () =>
  mirrorSnapshots({
    bucket,
    fetch: fakeFetch,
    sourceManifestUrl: BOARDSESH_SNAPSHOT_MANIFEST,
    publicBaseUrl: MIRROR,
    now: () => now,
  });

beforeEach(() => {
  now = Date.parse('2026-11-18T08:00:00Z');
  bucket = new MemoryBucket(() => now);
  downloads = [];
  served = new Map();
  files = new Map([
    [`${SOURCE}kilter/1/a.db`, gzipBytes(PART_BYTES * 2 + 1234, 1)],
    [`${SOURCE}tension/9/a.db`, gzipBytes(4096, 2)],
    [`${SOURCE}moonboard/2/a.db`, sqliteBytes(8192)],
    [`${SOURCE}decoy/1/a.db`, gzipBytes(512, 3)],
  ]);
  manifest = {
    formatVersion: 2,
    generatedAt: '2026-11-18T07:22:15.685Z',
    entries: [
      entry('kilter', 1, 'a.db', { grades: { url: `${SOURCE}kilter/1/a-grades.db` } }),
      entry('tension', 9, 'a.db'),
      entry('moonboard', 2, 'a.db'),
      entry('decoy', 1, 'a.db'),
    ],
  };
});

describe('ADR-0006: nightly snapshot mirror', () => {
  it('copies only BoardClimb boards byte for byte and publishes a manifest phones accept from the mirror', async () => {
    const report = await run();
    expect(report).toEqual({ entries: 3, copied: 3, reused: 0, deleted: 0 });
    for (const [board, layout] of [
      ['kilter', 1],
      ['tension', 9],
      ['moonboard', 2],
    ] as const) {
      const artifact = parseSnapshotArtifact(bucket.json(MANIFEST_KEY), board, layout, MIRROR_MANIFEST);
      expect(artifact.url).toBe(`${MIRROR}/board-snapshots/v1-gzip/${board}/${layout}/a.db`);
      const stored = bucket.objects.get(new URL(artifact.url).pathname.slice(1))!;
      expect(stored.value).toEqual(files.get(`${SOURCE}${board}/${layout}/a.db`)!);
      expect(stored.cacheControl).toContain('immutable');
    }
    expect(bucket.objects.has('board-snapshots/v1-gzip/decoy/1/a.db')).toBe(false);
    expect(bucket.json(MANIFEST_KEY).entries[0].grades).toBeUndefined();
    expect(bucket.objects.get(MANIFEST_KEY)!.cacheControl).toBe('public, max-age=300');
  });

  it('reuses artifacts it already holds on the retry run', async () => {
    await run();
    downloads = [];
    expect(await run()).toEqual({ entries: 3, copied: 0, reused: 3, deleted: 0 });
    expect(downloads).toEqual([]);
  });

  it('keeps the previous manifest and stores nothing partial when a download is short', async () => {
    await run();
    const before = bucket.json(MANIFEST_KEY);
    files.set(`${SOURCE}kilter/1/b.db`, gzipBytes(PART_BYTES + 99, 4));
    manifest.entries[0] = entry('kilter', 1, 'b.db');
    served.set(`${SOURCE}kilter/1/b.db`, files.get(`${SOURCE}kilter/1/b.db`)!.subarray(0, PART_BYTES + 10));
    await expect(run()).rejects.toThrow('does not match its manifest');
    expect(bucket.json(MANIFEST_KEY)).toEqual(before);
    expect(bucket.objects.has('board-snapshots/v1-gzip/kilter/1/b.db')).toBe(false);
    expect(bucket.aborted).toBe(1);
  });

  it('refuses a source entry that points off BoardSesh, publishing nothing', async () => {
    manifest.entries[1] = { ...manifest.entries[1], url: 'https://elsewhere.example/tension/9/a.db' };
    await expect(run()).rejects.toThrow();
    expect(bucket.objects.has(MANIFEST_KEY)).toBe(false);
  });

  it('deletes unlisted artifacts only after 14 days and never a listed one', async () => {
    await run();
    files.set(`${SOURCE}tension/9/b.db`, gzipBytes(2048, 5));
    manifest.entries[1] = entry('tension', 9, 'b.db');
    now += 2 * DAY;
    expect((await run()).deleted).toBe(0);
    expect(bucket.objects.has('board-snapshots/v1-gzip/tension/9/a.db')).toBe(true);
    now += 13 * DAY;
    expect((await run()).deleted).toBe(1);
    expect(bucket.objects.has('board-snapshots/v1-gzip/tension/9/a.db')).toBe(false);
    expect(bucket.objects.has('board-snapshots/v1-gzip/tension/9/b.db')).toBe(true);
    expect(bucket.objects.has('board-snapshots/v1-gzip/kilter/1/a.db')).toBe(true);
    expect(bucket.objects.has(MANIFEST_KEY)).toBe(true);
  });

  it('rejects a public base URL that is not a bare https origin', async () => {
    for (const publicBaseUrl of ['http://catalog.example.org', 'https://catalog.example.org/x', ''])
      await expect(
        mirrorSnapshots({
          bucket,
          fetch: fakeFetch,
          sourceManifestUrl: BOARDSESH_SNAPSHOT_MANIFEST,
          publicBaseUrl,
          now: () => now,
        }),
      ).rejects.toThrow();
  });
});
