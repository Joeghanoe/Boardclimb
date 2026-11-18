import { CatalogError } from '@boardclimb/catalog-core';
import { BOARDSESH_SNAPSHOT_MANIFEST } from './boardseshSnapshotManifest';
import type { SnapshotArtifact } from './SnapshotArtifact';
import { parseSnapshotEntry } from './parseSnapshotEntry';

/** Validate the public snapshot manifest at `manifestUrl` and return the selected layout's download. */
export function parseSnapshotArtifact(
  value: unknown,
  manufacturer: string,
  layout: number,
  manifestUrl: string = BOARDSESH_SNAPSHOT_MANIFEST,
): SnapshotArtifact {
  const invalid = () => new CatalogError('schema_mismatch', 'The catalog download description changed.');
  if (!value || typeof value !== 'object') throw invalid();
  const manifest = value as { formatVersion?: unknown; entries?: unknown };
  if (manifest.formatVersion !== 2 || !Array.isArray(manifest.entries)) throw invalid();
  const entry: unknown = manifest.entries.find(
    (e: Record<string, unknown> | null) => e?.boardType === manufacturer && e.layoutId === layout,
  );
  return parseSnapshotEntry(entry, manufacturer, layout, manifestUrl);
}
