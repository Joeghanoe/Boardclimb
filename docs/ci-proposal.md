# Proposed verification workflow

Status: inactive proposal for human review (CLD.2). No workflow is installed under
`.github/workflows`. To activate after review, a human can put the YAML below in
`.github/workflows/verify.yml`. Hosted execution remains unverified.

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
