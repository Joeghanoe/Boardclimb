import { CatalogError } from '@boardclimb/catalog-core';

/** Validate the public snapshot manifest before using its URL as a download target. */
export function parseSnapshotArtifact(
  value: unknown,
  manufacturer: string,
  layout: number,
): { url: string; bytes: number; uncompressedBytes: number; builtAt: string } {
  const invalid = () => new CatalogError('schema_mismatch', 'The catalog download description changed.');
  if (!value || typeof value !== 'object') throw invalid();
  const manifest = value as { formatVersion?: unknown; entries?: unknown };
  if (manifest.formatVersion !== 2 || !Array.isArray(manifest.entries)) throw invalid();
  const entry = manifest.entries.find(
    (e: Record<string, unknown>) => e?.boardType === manufacturer && e.layoutId === layout,
  ) as Record<string, unknown> | undefined;
  if (
    !entry ||
    entry.privacyVersion !== 1 ||
    typeof entry.url !== 'string' ||
    typeof entry.builtAt !== 'string' ||
    !Number.isFinite(Date.parse(entry.builtAt))
  )
    throw invalid();
  const url = new URL(entry.url);
  if (
    url.origin !== 'https://snapshots.boardsesh.com' ||
    !url.pathname.startsWith(`/board-snapshots/v1-gzip/${manufacturer}/${layout}/`) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw invalid();
  if (
    !Number.isSafeInteger(entry.bytes) ||
    Number(entry.bytes) < 1 ||
    !Number.isSafeInteger(entry.uncompressedBytes) ||
    Number(entry.uncompressedBytes) < 1 ||
    Number(entry.uncompressedBytes) > 512 * 1024 * 1024
  )
    throw invalid();
  return {
    url: url.href,
    bytes: Number(entry.bytes),
    uncompressedBytes: Number(entry.uncompressedBytes),
    builtAt: entry.builtAt,
  };
}
