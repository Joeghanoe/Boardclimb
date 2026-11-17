# Proposed verification workflow

Status: historical proposal, superseded by `.github/workflows/verify.yml` when the
product owner requested completion of the remaining MVP work (2026-11-17), including
the previously listed CI activation. The active workflow pins action revisions, runs
the same project gate, exports web/iOS JavaScript and compiles Android. It has no
deployment, signing credentials or write permissions. Hosted results are recorded
separately in the implementation report. The original minimal proposal follows.

The job uses the same frozen install and `bun run verify` as local development,
including SQLite scale tests. Version pins are read from the repository. It does
not install the external workstation harness, build a native app or test a board.
The external harness's additional design checks are not claimed as CI checks.

```yaml
name: Verify

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          package-manager-cache: false
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - run: bun run verify
```

Review action revisions before activation; major tags above are updateable, not
immutable supply-chain pins. The setup inputs follow the upstream
[setup-node documentation](https://github.com/actions/setup-node) and
[setup-bun documentation](https://github.com/oven-sh/setup-bun).
