/** The part of a Cloudflare R2 bucket binding the mirror uses; tests pass an in-memory bucket. */
export interface MirrorBucket {
  head(key: string): Promise<{ size: number } | null>;
  put(key: string, value: Uint8Array | string, options: MirrorWriteOptions): Promise<unknown>;
  createMultipartUpload(key: string, options: MirrorWriteOptions): Promise<MirrorUpload>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: { key: string; uploaded: Date }[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete(keys: string[]): Promise<void>;
}

export interface MirrorWriteOptions {
  httpMetadata: { contentType: string; cacheControl: string };
}

export interface MirrorUpload {
  uploadPart(partNumber: number, value: Uint8Array): Promise<{ partNumber: number; etag: string }>;
  complete(parts: { partNumber: number; etag: string }[]): Promise<unknown>;
  abort(): Promise<void>;
}
