import { expect, it } from 'bun:test';
import { catalogManifestUrls } from './catalogManifestUrls';

const BOARDSESH = 'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json';

it('ADR-0006: a configured mirror is tried before BoardSesh, at the same manifest path', () => {
  expect(catalogManifestUrls('https://catalog.example.org')).toEqual([
    'https://catalog.example.org/board-snapshots/v1-gzip/manifest.json',
    BOARDSESH,
  ]);
});

it('ADR-0006: without a valid https mirror origin phones use BoardSesh alone', () => {
  for (const value of [undefined, '', 'nope', 'http://catalog.example.org', 'https://catalog.example.org/x'])
    expect(catalogManifestUrls(value)).toEqual([BOARDSESH]);
});
