// `@boardclimb/provider-snapshots/manifest`: the manifest rules alone, without the bundled hardware data,
// so the snapshot mirror (ADR-0006) validates exactly what phones validate.
export { BOARDSESH_SNAPSHOT_MANIFEST } from './boardseshSnapshotManifest';
export type { SnapshotArtifact } from './SnapshotArtifact';
export { parseSnapshotArtifact } from './parseSnapshotArtifact';
export { parseSnapshotEntry } from './parseSnapshotEntry';
