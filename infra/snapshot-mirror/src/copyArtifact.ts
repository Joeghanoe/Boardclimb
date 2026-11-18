import type { SnapshotArtifact } from '@boardclimb/provider-snapshots/manifest';
import type { FetchFile } from './FetchFile';
import type { MirrorBucket, MirrorUpload } from './MirrorBucket';

/** R2 needs every multipart part but the last to have the same size, of at least 5 MiB. */
export const PART_BYTES = 16 * 1024 * 1024;
const ARTIFACT_METADATA = {
  httpMetadata: { contentType: 'application/x-sqlite3', cacheControl: 'public, max-age=31536000, immutable' },
};

/**
 * Stream one artifact into the bucket without holding it in memory. The bytes are stored as received, with no
 * Content-Encoding: either the gzip file (`bytes` long) or, if the runtime decoded it, the SQLite file
 * (`uncompressedBytes` long). Phones accept both. Anything else is aborted and never becomes visible.
 */
export async function copyArtifact(
  bucket: MirrorBucket,
  fetchFile: FetchFile,
  artifact: SnapshotArtifact,
  key: string,
): Promise<number> {
  const response = await fetchFile(artifact.url, { headers: { 'Accept-Encoding': 'gzip' } });
  if (!response.ok || !response.body) throw new Error(`Download of ${key} failed with ${response.status}`);
  const limit = Math.max(artifact.bytes, artifact.uncompressedBytes);
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;
  let total = 0;
  let head: Uint8Array = new Uint8Array();
  let upload: MirrorUpload | undefined;
  const parts: { partNumber: number; etag: string }[] = [];

  const take = (length: number): Uint8Array => {
    const out = new Uint8Array(length);
    let filled = 0;
    while (filled < length) {
      const chunk = pending[0]!;
      const used = Math.min(chunk.length, length - filled);
      out.set(chunk.subarray(0, used), filled);
      filled += used;
      if (used === chunk.length) pending.shift();
      else pending[0] = chunk.subarray(used);
    }
    pendingBytes -= length;
    return out;
  };

  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) throw new Error(`Download of ${key} is larger than its manifest says`);
      if (head.length < 16) head = concat(head, value.subarray(0, 16 - head.length));
      pending.push(value);
      pendingBytes += value.length;
      while (pendingBytes >= PART_BYTES) {
        upload ??= await bucket.createMultipartUpload(key, ARTIFACT_METADATA);
        parts.push(await upload.uploadPart(parts.length + 1, take(PART_BYTES)));
      }
    }
    const gzip = head[0] === 0x1f && head[1] === 0x8b;
    const sqlite = new TextDecoder().decode(head.subarray(0, 15)) === 'SQLite format 3';
    if (!((gzip && total === artifact.bytes) || (sqlite && total === artifact.uncompressedBytes)))
      throw new Error(`Download of ${key} does not match its manifest (${total} bytes)`);
    const rest = take(pendingBytes);
    if (!upload) {
      await bucket.put(key, rest, ARTIFACT_METADATA);
      return total;
    }
    if (rest.length > 0) parts.push(await upload.uploadPart(parts.length + 1, rest));
    await upload.complete(parts);
    return total;
  } catch (error) {
    await upload?.abort().catch(() => undefined);
    throw error;
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}
