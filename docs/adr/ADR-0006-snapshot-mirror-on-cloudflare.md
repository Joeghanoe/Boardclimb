# ADR-0006: Mirror BoardSesh snapshots on Cloudflare R2

- **Status:** Accepted by the product owner on 2026-11-18 ("Lets do a mirror"). This is the first piece of hosted infrastructure (AGENTS.md "When to ask": a backend). Not deployed: a human creates the Cloudflare resources and deploys (CLD.2). BoardSesh's view on a public mirror is asked before it serves anyone beyond private gym tests.
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
   - refuses the whole run if any of those entries fails the phones' own rules
     (`parseSnapshotEntry`, shared through `@boardclimb/provider-snapshots/manifest`);
   - for each artifact not yet in the bucket, streams it into R2 in 16 MiB multipart parts,
     never holding the file in memory. It stores the bytes exactly as received and keeps
     them only if they are the gzip file (`bytes` long) or, if the runtime decoded the
     transfer, the SQLite file (`uncompressedBytes` long). Anything else is aborted;
   - writes `board-snapshots/v1-gzip/manifest.json`, the same path as BoardSesh's, only after
     every artifact it names is stored. It keeps BoardSesh's fields, rewrites `url` to the
     mirror and drops the sibling `grades` files, which phones do not read. A failed run
     leaves the previous manifest in place;
   - deletes mirrored artifacts that BoardSesh's current manifest no longer lists
     once they are 14 days old, so the mirror never keeps data longer than the source.
3. **Caching:** artifacts are served with `Cache-Control: public, max-age=31536000, immutable`
   (their key includes the build time). The manifest uses `max-age=300`, matching BoardSesh.
   Files are served as stored, without `Content-Encoding`. Phones already recognise gzip or
   SQLite by the first bytes and check the matching length, so both shapes install.
4. **Phone:** a build with `EXPO_PUBLIC_CATALOG_MIRROR_URL` set to the mirror's bare https
   origin makes `DeviceSnapshotReader` try the mirror manifest first. It falls back to
   BoardSesh's if the mirror is unreachable, fails validation or its download fails. Without
   the setting, phones read BoardSesh alone, as before.
   `parseSnapshotArtifact` takes the manifest's origin and accepts artifact URLs only
   on that same origin. The install path is unchanged: size checks, bounded gunzip,
   `PRAGMA quick_check`, schema probes, completion marker, at most one refresh check per
   day, and the rule that a failed refresh never replaces a good file. Neither host
   receives any user, device or log data. Requests carry no identifiers, cookies or
   tokens.
5. **Ownership and delivery:** the Worker lives in its own workspace (`infra/snapshot-mirror/`, with its
   `wrangler.toml`). The dependency-boundary test allows it only the manifest rules and keeps it out of the
   app's composition. `.github/workflows/deploy-snapshot-mirror.yml` bundles it on pull requests and, after
   a merge to main, runs `scripts/deploy.sh`: it creates the R2 bucket and custom domain if missing, deploys
   the Worker and checks the published manifest with the phones' rules. The deploy job runs in the
   `snapshot-mirror` GitHub environment, which holds the Cloudflare token and can require a reviewer. A human
   creates the Cloudflare account and token and merges (CLD.2). No credential enters the repo or the app.

## Consequences

- Catalog installs and refreshes keep working through a BoardSesh outage for up to
  14 days of staleness, and indefinitely for files already mirrored. Climbers see the
  same "could not be downloaded" message only when both hosts fail.
- New problems appear up to about an hour later than they do on BoardSesh.
- We now run hosted infrastructure, which needs an owner, an alert for a missed nightly
  fill and a budget. Storage stays within R2's free tier: under 1 GB, with class A/B
  operations far below the free limits for a private gym-test audience. Copying the 84 MB
  Kilter file needs more CPU than the Workers free plan's 10 ms, so the Worker needs
  Workers Paid (5 USD a month; `limits.cpu_ms` in `wrangler.toml`).
- We redistribute data. BoardSesh's `LEGAL.md` welcomes use of the snapshots and
  offers to talk about syncing non-user data to another service. Before the mirror serves
  anyone beyond private gym tests we ask them directly whether a public mirror is fine, and record the answer in
  `docs/licensing-inventory.md`. Manufacturer and commercial rights stay the open
  release review that ADR-0005 already records.
- Setter attribution is unchanged: it comes from the same rows.

## Verification

- `infra/snapshot-mirror/src/mirrorSnapshots.test.ts`, over an in-memory bucket that enforces
  R2's equal-part rule: only BoardClimb boards are copied byte for byte; the published
  manifest passes the phones' parser for the mirror origin; a short download keeps the
  previous manifest and stores nothing; an off-origin source entry publishes nothing; a
  retry reuses stored files; unlisted files go only after 14 days.
- `packages/provider-snapshots/src/parseSnapshotEntry.test.ts`: a manifest may only point at
  its own origin and the selected layout's folder.
- `apps/mobile/src/composition/DeviceSnapshotReader.test.ts`: phones install from the mirror
  first and reach BoardSesh when the mirror is down; `catalogManifestUrls.test.ts` covers the
  build setting.
- Still to do after deployment: one manual run of the Worker, then a phone installing Kilter
  Original from the mirror with `PRAGMA quick_check` passing.

## Open questions for the first deployment

- BoardSesh's host returns raw gzip only when the client accepts gzip; with
  `Accept-Encoding: identity` it decodes (measured 2026-11-18). Whether a Worker's `fetch`
  passes the gzip bytes through or decodes them is unverified. The mirror accepts both, but a
  decoded Kilter file is about 2.7 times larger to store and download.
- Cron CPU and wall time for the 84 MB copy are estimated, not measured.

## Alternatives

| Option                                                         | Why not                                                                                                                                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redis cache behind a reverse proxy                             | A server to run and patch, RAM priced for 84 MB blobs, and an eviction policy that has nothing to do with "keep the last good file". Solves latency, not availability.                             |
| Cloudflare cache rules or a Worker proxy in front of BoardSesh | Least work, but edge caches evict cold objects and offer no guarantee during an outage. Fine as a stopgap, not as a fallback.                                                                      |
| GitHub Actions cron uploading to GitHub Releases or Pages      | No hosting to pay for, but Pages caps files at 100 MB and site size at 1 GB, and Releases are not meant as an app CDN. It does avoid a Cloudflare account. This is the fallback if R2 is rejected. |
| Run BoardSesh's sync and export code ourselves                 | Needs vendor accounts, stored credentials and Postgres. ADR-0005 and AGENTS.md exclude those.                                                                                                      |
| BoardLib                                                       | Python, no MoonBoard database, and the Kilter database no longer syncs after Kilter's March 2026 move.                                                                                             |
