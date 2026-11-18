/** One validated catalog download from a snapshot manifest. */
export interface SnapshotArtifact {
  url: string;
  bytes: number;
  uncompressedBytes: number;
  builtAt: string;
}
