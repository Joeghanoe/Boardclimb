# ADR-0006: Mirror BoardSesh snapshots on Cloudflare R2

- **Status:** Proposed. Needs product-owner approval, because it adds the first piece of hosted infrastructure (AGENTS.md "When to ask": a backend).
- **Date:** 2026-11-18
- **Authority:** The product owner asked for a proposed ADR for a cache in front of the board catalogs, filled from BoardSesh's output, that phones use when they look for new problems.
- **Related:** ADR-0005 (snapshot source, validation and install rules), ADR-0002 (no hosted BoardSesh API), ADR-0003 (log storage is unaffected).

## Context

Phones download catalogs straight from
`https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json`
(`apps/mobile/src/composition/DeviceSnapshotReader.ts`), and
`parseSnapshotArtifact` only accepts artifact URLs on that origin. If BoardSesh's
host is down, slow, changes its URL or stops publishing, nobody can install or
refresh a layout.

BoardSesh builds the snapshots from its own Postgres database. Its own importers
fill that database: `aurora-sync` (Tension and pre-2026 Kilter, using stored user
credentials), `kilter-sync` (Kilter Grips over OAuth) and a manual MoonBoard
import. BoardLib is credited but not used at revision `c788005`. Running those
importers ourselves would need vendor accounts and a database, so we copy the
output instead of rebuilding it.

Measured on 2026-11-18, the manifest lists 23 artifacts: 167 MB gzipped
(448 MB uncompressed) across all board types. Kilter Original alone is about 84 MB.
Artifacts are timestamped and never change, and BoardSesh deletes superseded ones
after 14 days. Exports run nightly at 07:15 UTC.

## Decision

Mirror the public snapshot files, not a live cache. The catalog is a few large,
write-once files that change once a day, which is what object storage plus a CDN
handles well. Redis and a reverse-proxy server add a machine to run and pay for
without making the files more available.

1. **Storage:** one Cloudflare R2 bucket, served on a custom domain behind
   Cloudflare's CDN, for example `catalog.<our-domain>`. The domain is chosen at approval.
   R2 charges nothing for egress, so the large Kilter download costs the same as a small one.
2. **Fill:** a Cloudflare Worker on a cron trigger at 08:00 UTC, 45 minutes after
   BoardSesh's export, plus a retry at 14:00 UTC. Each run:
   - fetches BoardSesh's manifest and validates it with the same rules as
     `parseSnapshotArtifact` (format 2, privacy version 1, expected origin and path,
     byte limits);
   - keeps only `kilter`, `tension` and `moonboard` entries;
   - for each new `key` not yet in the bucket, streams the gzipped bytes into R2 without
     decompressing and checks the stored length against `bytes`;
   - writes our own `v1-gzip/manifest.json` only after every artifact it names is
     stored. It keeps BoardSesh's fields and rewrites only `url`. A failed run leaves
     the previous manifest in place;
   - deletes mirrored artifacts that BoardSesh's current manifest no longer lists
     once they are 14 days old, so the mirror never keeps data longer than the source.
3. **Caching:** artifacts are served with `Cache-Control: public, max-age=31536000, immutable`
   (their key includes the build time). The manifest uses `max-age=300`, matching BoardSesh.
   Gzipped bytes are served as stored with `Content-Encoding: gzip`, as today.
4. **Phone:** `DeviceSnapshotReader` tries the mirror manifest first and falls
   back to BoardSesh's if the mirror is unreachable or fails validation.
   `parseSnapshotArtifact` takes the manifest's origin and accepts artifact URLs only
   on that same origin. The install path is unchanged: size checks, bounded gunzip,
   `PRAGMA quick_check`, schema probes, completion marker, at most one refresh check per
   day, and the rule that a failed refresh never replaces a good file. Neither host
   receives any user, device or log data. Requests carry no identifiers, cookies or
   tokens.
5. **Ownership:** the Worker and bucket live in their own folder (`infra/snapshot-mirror/`)
   with an architecture test that nothing under `apps/` or `packages/` imports it. A
   human creates the Cloudflare account, bucket, domain and API token and deploys the
   Worker (CLD.2). No credential enters the repo or the app.

## Consequences

- Catalog installs and refreshes keep working through a BoardSesh outage for up to
  14 days of staleness, and indefinitely for files already mirrored. Climbers see the
  same "could not be downloaded" message only when both hosts fail.
- New problems appear up to about an hour later than they do on BoardSesh.
- We now run hosted infrastructure, which needs an owner, an alert for a missed nightly
  fill and a budget. Expected cost is within R2's free tier: under 1 GB stored, and class
  A/B operations far below the free limits for a private gym-test audience. Worker cron
  runs fit the free plan, apart from a possible paid wall-time need (see the spike below).
- We redistribute data. BoardSesh's `LEGAL.md` welcomes use of the snapshots and
  offers to talk about syncing non-user data to another service. Before approval we
  ask them directly whether a public mirror is fine, and record the answer in
  `docs/licensing-inventory.md`. Manufacturer and commercial rights stay the open
  release review that ADR-0005 already records.
- Setter attribution is unchanged: it comes from the same rows.

## Verification

- Worker unit tests with recorded manifests: rejects bad manifests, never publishes a
  manifest naming a missing or short artifact, prunes only after 14 days.
- `parseSnapshotArtifact` tests for an accepted mirror origin, a rejected
  cross-origin artifact URL and fallback order. A composition scenario where the mirror
  fails and BoardSesh serves the catalog, and the reverse.
- Before rollout, one manual end-to-end check: a phone installs Kilter Original from the
  mirror and `PRAGMA quick_check` passes.

## Open spikes before acceptance

- R2 needs a known length on streamed `put`. Confirm that a `FixedLengthStream` sized from
  `Content-Length` copies the 84 MB artifact within a cron invocation's limits. If it
  doesn't, use a multipart upload.
- Confirm BoardSesh's artifact host serves the stored gzip bytes when asked for
  `Accept-Encoding: identity`, so the Worker copies them byte for byte.

## Alternatives

| Option                                                         | Why not                                                                                                                                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redis cache behind a reverse proxy                             | A server to run and patch, RAM priced for 84 MB blobs, and an eviction policy that has nothing to do with "keep the last good file". Solves latency, not availability.                             |
| Cloudflare cache rules or a Worker proxy in front of BoardSesh | Least work, but edge caches evict cold objects and offer no guarantee during an outage. Fine as a stopgap, not as a fallback.                                                                      |
| GitHub Actions cron uploading to GitHub Releases or Pages      | No hosting to pay for, but Pages caps files at 100 MB and site size at 1 GB, and Releases are not meant as an app CDN. It does avoid a Cloudflare account. This is the fallback if R2 is rejected. |
| Run BoardSesh's sync and export code ourselves                 | Needs vendor accounts, stored credentials and Postgres. ADR-0005 and AGENTS.md exclude those.                                                                                                      |
| BoardLib                                                       | Python, no MoonBoard database, and the Kilter database no longer syncs after Kilter's March 2026 move.                                                                                             |
