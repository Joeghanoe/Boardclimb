import { CatalogError } from '@boardclimb/catalog-core';
import type { SnapshotArtifact } from './SnapshotArtifact';

/**
 * Validate one manifest entry before its URL is used as a download target. The artifact must live on the
 * manifest's own origin, under `<manifest folder>/<manufacturer>/<layout>/`, so a mirror can only point at itself.
 */
export function parseSnapshotEntry(
  entry: unknown,
  manufacturer: string,
  layout: number,
  manifestUrl: string,
): SnapshotArtifact {
  const invalid = () => new CatalogError('schema_mismatch', 'The catalog download description changed.');
  if (!entry || typeof entry !== 'object') throw invalid();
  const fields = entry as Record<string, unknown>;
  if (
    fields.boardType !== manufacturer ||
    fields.layoutId !== layout ||
    fields.privacyVersion !== 1 ||
    typeof fields.url !== 'string' ||
    typeof fields.builtAt !== 'string' ||
    !Number.isFinite(Date.parse(fields.builtAt))
  )
    throw invalid();
  const manifest = new URL(manifestUrl);
  let url: URL;
  try {
    url = new URL(fields.url);
  } catch {
    throw invalid();
  }
  if (
    url.origin !== manifest.origin ||
    !url.pathname.startsWith(`${new URL('.', manifest).pathname}${manufacturer}/${layout}/`) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw invalid();
  if (
    !Number.isSafeInteger(fields.bytes) ||
    Number(fields.bytes) < 1 ||
    !Number.isSafeInteger(fields.uncompressedBytes) ||
    Number(fields.uncompressedBytes) < 1 ||
    Number(fields.uncompressedBytes) > 512 * 1024 * 1024
  )
    throw invalid();
  return {
    url: url.href,
    bytes: Number(fields.bytes),
    uncompressedBytes: Number(fields.uncompressedBytes),
    builtAt: fields.builtAt,
  };
}
