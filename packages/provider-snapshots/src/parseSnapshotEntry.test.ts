import { describe, expect, it } from 'bun:test';
import { BOARDSESH_SNAPSHOT_MANIFEST } from './boardseshSnapshotManifest';
import { parseSnapshotArtifact } from './parseSnapshotArtifact';

const MIRROR = 'https://catalog.example.org/board-snapshots/v1-gzip/manifest.json';
const entry = (url: string) => ({
  boardType: 'kilter',
  layoutId: 1,
  privacyVersion: 1,
  url,
  bytes: 100,
  uncompressedBytes: 1000,
  builtAt: '2026-11-18T07:22:15.685Z',
});
const manifest = (url: string) => ({ formatVersion: 2, entries: [entry(url)] });

describe('FR-006/ADR-0006: a manifest may only point at downloads on its own origin', () => {
  it('accepts BoardSesh artifacts from the BoardSesh manifest and mirror artifacts from the mirror manifest', () => {
    const boardsesh = 'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/kilter/1/a.db';
    const mirrored = 'https://catalog.example.org/board-snapshots/v1-gzip/kilter/1/a.db';
    expect(parseSnapshotArtifact(manifest(boardsesh), 'kilter', 1).url).toBe(boardsesh);
    expect(parseSnapshotArtifact(manifest(boardsesh), 'kilter', 1, BOARDSESH_SNAPSHOT_MANIFEST).url).toBe(
      boardsesh,
    );
    expect(parseSnapshotArtifact(manifest(mirrored), 'kilter', 1, MIRROR).url).toBe(mirrored);
  });

  it('rejects a mirror manifest that sends phones elsewhere or outside the selected layout', () => {
    for (const url of [
      'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/kilter/1/a.db',
      'https://catalog.example.org/elsewhere/kilter/1/a.db',
      'https://catalog.example.org/board-snapshots/v1-gzip/kilter/2/a.db',
      'https://catalog.example.org/board-snapshots/v1-gzip/kilter/1/../../tension/9/a.db',
      'https://catalog.example.org/board-snapshots/v1-gzip/kilter/1/a.db?x=1',
      'not a url',
    ])
      expect(() => parseSnapshotArtifact(manifest(url), 'kilter', 1, MIRROR)).toThrow();
  });
});
