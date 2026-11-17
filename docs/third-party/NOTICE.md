# Third-party notices

BoardClimb includes adaptations of Boardsesh's BLE interoperability algorithms and
catalog schema/metadata at revision `c788005578c3650e6684d68ca48988104d9eb32c` (2026-11-17).
Source: https://github.com/boardsesh/boardsesh/tree/c788005578c3650e6684d68ca48988104d9eb32c
Copyright Boardsesh contributors. Licensed under Apache License 2.0; see
[boardsesh-LICENSE.txt](boardsesh-LICENSE.txt).

Modified for BoardClimb's domain, strict validation, explicit Light up and isolated
transport ports. No upstream automatic send, account, social or session code is used.

BoardClimb also includes traced hold-outline polygons from Boardsesh revision
`2ae776efb8a6bbbe9ca05441d3606456e61c51e4` (2026-11-17), from
`packages/shared/board-art-geometry/src/generated/{kilter,moonboard,tension}/*.cjs`.
Only the `outlines` tables are retained in `packages/provider-snapshots/data/hold-outlines.json`.
The renderer and action bar are BoardClimb implementations. Copyright Boardsesh
contributors, Apache-2.0. Manufacturer artwork rights remain open before public distribution.
