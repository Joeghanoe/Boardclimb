import { parseSnapshotEntry } from '@boardclimb/provider-snapshots/manifest';
import type { FetchFile } from './FetchFile';
import type { MirrorBucket } from './MirrorBucket';
import { copyArtifact } from './copyArtifact';

/** The manufacturers BoardClimb reads; other board types in the source manifest are not copied. */
const MIRRORED = ['kilter', 'moonboard', 'tension'];
/** BoardSesh prunes superseded artifacts after 14 days; the mirror never keeps them longer (ADR-0006). */
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export interface MirrorRun {
  bucket: MirrorBucket;
  fetch: FetchFile;
  sourceManifestUrl: string;
  /** The mirror's public origin, for example `https://catalog.example.org`. */
  publicBaseUrl: string;
  now: () => number;
}

export interface MirrorReport {
  entries: number;
  copied: number;
  reused: number;
  deleted: number;
}

/**
 * One nightly pass: validate the source manifest with the phones' rules, copy new artifacts, publish the mirror
 * manifest last, then prune what the source no longer lists. Any failure before publishing leaves the previous
 * mirror manifest, and every file it names, untouched.
 */
export async function mirrorSnapshots(run: MirrorRun): Promise<MirrorReport> {
  const base = new URL(run.publicBaseUrl);
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash || base.username)
    throw new Error('PUBLIC_BASE_URL must be a bare https origin');
  const source = new URL(run.sourceManifestUrl);
  const manifestKey = source.pathname.slice(1);
  const folder = new URL('.', source).pathname.slice(1);

  const response = await run.fetch(source.href, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Source manifest failed with ${response.status}`);
  const manifest = (await response.json()) as { formatVersion?: unknown; entries?: unknown };
  if (manifest.formatVersion !== 2 || !Array.isArray(manifest.entries))
    throw new Error('Source manifest format changed');

  const entries: Record<string, unknown>[] = [];
  let copied = 0;
  let reused = 0;
  for (const raw of manifest.entries as unknown[]) {
    const entry = raw as Record<string, unknown> | null;
    if (!entry || typeof entry.boardType !== 'string' || !MIRRORED.includes(entry.boardType)) continue;
    const artifact = parseSnapshotEntry(entry, entry.boardType, Number(entry.layoutId), source.href);
    const key = new URL(artifact.url).pathname.slice(1);
    const stored = await run.bucket.head(key);
    if (stored && (stored.size === artifact.bytes || stored.size === artifact.uncompressedBytes)) reused += 1;
    else {
      await copyArtifact(run.bucket, run.fetch, artifact, key);
      copied += 1;
    }
    // Phones do not read the sibling grades files, so they are neither copied nor advertised.
    const { grades: _grades, ...kept } = entry;
    entries.push({ ...kept, key, url: new URL(key, base).href });
  }
  if (entries.length === 0) throw new Error('Source manifest lists no mirrored boards');

  await run.bucket.put(
    manifestKey,
    JSON.stringify({ ...manifest, entries, mirroredAt: new Date(run.now()).toISOString() }),
    { httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=300' } },
  );

  const keep = new Set([manifestKey, ...entries.map((entry) => String(entry.key))]);
  const expired: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await run.bucket.list(
      cursor === undefined ? { prefix: folder } : { prefix: folder, cursor },
    );
    for (const object of page.objects)
      if (!keep.has(object.key) && run.now() - object.uploaded.getTime() > RETENTION_MS)
        expired.push(object.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);
  for (let i = 0; i < expired.length; i += 1000) await run.bucket.delete(expired.slice(i, i + 1000));

  return { entries: entries.length, copied, reused, deleted: expired.length };
}
