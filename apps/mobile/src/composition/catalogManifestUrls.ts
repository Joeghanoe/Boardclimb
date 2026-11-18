import { BOARDSESH_SNAPSHOT_MANIFEST } from '@boardclimb/provider-snapshots';

/**
 * Where phones look for catalog manifests, in order (ADR-0006): the configured mirror origin, then BoardSesh.
 * A missing or malformed mirror setting falls back to BoardSesh alone rather than failing the build.
 */
export function catalogManifestUrls(mirrorOrigin: string | undefined): string[] {
  if (!mirrorOrigin) return [BOARDSESH_SNAPSHOT_MANIFEST];
  let origin: URL;
  try {
    origin = new URL(mirrorOrigin);
  } catch {
    return [BOARDSESH_SNAPSHOT_MANIFEST];
  }
  if (
    origin.protocol !== 'https:' ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    origin.username
  )
    return [BOARDSESH_SNAPSHOT_MANIFEST];
  const mirror = new URL(new URL(BOARDSESH_SNAPSHOT_MANIFEST).pathname, origin).href;
  return [mirror, BOARDSESH_SNAPSHOT_MANIFEST];
}
