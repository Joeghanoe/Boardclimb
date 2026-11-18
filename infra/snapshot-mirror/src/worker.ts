import { BOARDSESH_SNAPSHOT_MANIFEST } from '@boardclimb/provider-snapshots/manifest';
import type { MirrorBucket } from './MirrorBucket';
import { mirrorSnapshots } from './mirrorSnapshots';

interface Env {
  SNAPSHOTS: MirrorBucket;
  PUBLIC_BASE_URL: string;
}

/** Cloudflare Worker entry: the cron triggers in wrangler.toml run one mirror pass (ADR-0006). */
export default {
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    const report = await mirrorSnapshots({
      bucket: env.SNAPSHOTS,
      fetch: (url, init) => fetch(url, init),
      sourceManifestUrl: BOARDSESH_SNAPSHOT_MANIFEST,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      now: () => Date.now(),
    });
    console.log(JSON.stringify({ event: 'snapshot_mirror_run', ...report }));
  },
};
