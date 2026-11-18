/**
 * Post-deploy check (ADR-0006): the mirror manifest, if the first nightly fill has run, must pass the phones'
 * own rules for every entry, and one artifact must be downloadable at its advertised size.
 * Usage: bun scripts/checkMirror.ts catalog.example.org
 */
import { BOARDSESH_SNAPSHOT_MANIFEST, parseSnapshotEntry } from '@boardclimb/provider-snapshots/manifest';

const host = Bun.argv[2];
if (!host) throw new Error('Pass the mirror host name');
const manifestUrl = new URL(new URL(BOARDSESH_SNAPSHOT_MANIFEST).pathname, `https://${host}`).href;
const response = await fetch(manifestUrl);
if (response.status === 404) {
  console.log(
    `::warning::No mirror manifest yet at ${manifestUrl}; the first fill runs at the next cron (08:00 UTC).`,
  );
  process.exit(0);
}
if (!response.ok) throw new Error(`${manifestUrl} returned ${response.status}`);
const manifest = (await response.json()) as { formatVersion?: unknown; entries?: Record<string, unknown>[] };
if (manifest.formatVersion !== 2 || !Array.isArray(manifest.entries) || manifest.entries.length === 0)
  throw new Error('Mirror manifest has an unexpected format');
const artifacts = manifest.entries.map((entry) =>
  parseSnapshotEntry(entry, String(entry.boardType), Number(entry.layoutId), manifestUrl),
);
const smallest = artifacts.reduce((a, b) => (a.bytes <= b.bytes ? a : b));
const file = await fetch(smallest.url, { headers: { 'Accept-Encoding': 'identity' } });
const size = (await file.arrayBuffer()).byteLength;
if (!file.ok || (size !== smallest.bytes && size !== smallest.uncompressedBytes))
  throw new Error(`${smallest.url} returned ${file.status} with ${size} bytes`);
console.log(`Mirror manifest lists ${artifacts.length} layouts; ${smallest.url} downloads at ${size} bytes.`);
