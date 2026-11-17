# BoardClimb MVP gym-test implementation — 2026-11-17

## Outcome

Phone composition now uses real public BoardSesh snapshot catalogs and native BLE
for Kilter, MoonBoard and Tension. The web preview stays explicitly synthetic and
in-memory. This is ready for a locally signed iPhone gym-test build, not a claim of
verified physical hardware or commercial distribution approval.

User authority: borrow BoardSesh catalogs/Bluetooth; finish the remaining MVP; use
Ubuntu as the stable development environment; install Android test tooling; publish
changes to main. The owner will build with Xcode/Personal Team on their MacBook and
perform physical iPhone testing. No credentials, accounts or backend were added.

## Delivered

- Pinned BoardSesh `c788005578c3650e6684d68ca48988104d9eb32c` and retained Apache
  license/attribution before reuse. Catalogs use explicitly public nightly snapshots,
  never the hosted BoardSesh app API. Public setter attribution appears on detail.
- Three real `ProviderSource` implementations through the shared snapshot adapter:
  stable layout/size/angle keys, UUID pagination, original paired Font/V grades,
  angle-specific nullable ratings, compatible sizes and complete hold mappings.
  Published single-frame problems only; no guessed animation flattening.
- Native lazy `react-native-ble-plx` transport, Nordic UART/RedBearLab characteristic
  selection, bounded chunks and shared Aurora v2/v3 / standard-Mini MoonBoard encoding.
  Only explicit Light up sends bytes; unknown versions/partial mappings are refused.
  Readback, simultaneous-phone support and takeover remain unknown until observed.
- Separate snapshot files validated before publication, streamed gzip decoding,
  concurrent-open deduplication and read leases. Retain two completed versions per
  layout; retire old handles safely. Core cached problems and history are never pruned.
- Offline native board/layout selection from pinned factual metadata, cross-layout
  downloaded name/grade/rating browsing, real coordinate diagrams and saved detail
  attribution. Browsing mode, query and scroll remain on Back. Controller confirmation
  uses compact layout/size then angle selection with Connect near the top.
- Contextual permissions, manual controller selection, stale-scan guards, serialized
  latest-intent connections and commands, cancellation-safe pending feedback. Reconnect
  never replays LEDs. Existing attempt/Top/Flash and session-day rules are unchanged.
- iOS Release-device command, Bluetooth configuration, generated-project ignore rules,
  [MacBook build guide](docs/iphone-gym-test.md), and a six-scenario/32-step unexecuted
  [gym workbook](docs/testing/iphone-gym-test.xlsx) with its JSON specification.
- GitHub Actions configuration with immutable action pins/read-only permissions:
  frozen install, same project verify, web/iOS JavaScript exports and Android native
  compilation. No deployment, signing service or repository-writing automation.

## Requirement evidence

| Criteria | Evidence and scope |
| --- | --- |
| FR-001/005/006/007/018 | Real recorded SQLite subsets, original DDL and manifests for all three sources; snapshot source tests page without duplicates, preserve nullable angle stats and map complete holds. |
| FR-004/006/015/018, AC-019 | Real composition + SQLite scenario warms all three catalogs, opens details, logs, closes/reopens offline, searches downloaded layouts and preserves geometry, attribution and history. |
| FR-008/009/017 | Upstream byte vectors, v2/v3 framing and standard/Mini grid tests; recorded-source scenario proves browse/connect/resume emit no pattern and explicit Light up emits bytes. Scripted radio only. |
| FR-003/009/017 | Deferred-completion regressions cover late controller/manufacturer choices, disconnect while connecting and switch/disconnect during an in-flight write; later explicit commands remain usable. |
| FR-006 | Native-reader logic over real SQLite/gzip/files with injected native I/O seams covers validated install, old read leases, two-version retention, failed refresh and concurrent installed-file recovery. Actual Expo file APIs still need the phone test. |
| FR-012–015 | Existing log invariant/SQL/migration/day-boundary suites continue passing; no log rule, table or stored-total changes. |
| UI-1/UI-2/NFR-007 | Browser captures at 320/390/768/1280 in light/dark, expanded filters/editor, downloaded search, map and controller states; keyboard and interactive flows retained outside repo. Geometry ratio has an independent DOM assertion. Automated checks are partial, not a WCAG compliance claim. |

## Verification and review

- `bun install --frozen-lockfile` and the full project/harness verify passed in Ubuntu
  with Node 24.22.3 and Bun 1.4.4. Format, lint, strict TypeScript, all tests and design/
  decision gates pass. CODE.5's C# runner reports not applicable; TypeScript boundaries
  and file coverage were independently inspected.
- Android SDK/JDK 21 installed under the Linux home directory. Native Android debug
  compilation passed: 359 tasks, 5m36s on the first local build. This verifies compilation,
  not emulator/device execution; the Device panel had no usable Android device host.
- iOS prebuild succeeds, with Bluetooth usage/background settings. iOS JavaScript/Hermes
  export succeeds. Configured build minima are Android API 24 and iOS 16.4, not an
  empirically verified compatibility matrix. iOS compilation/signing remains on the Mac.
- Independent code review used five bounded passes; the extra passes addressed evidenced
  concurrency defects. IR-1 late connections, IR-2 unbounded/leaked snapshot handles,
  IR-3 exhausted refresh and IR-4 stuck pending command were reproduced and fixed.
  Final code coverage accounts for 97 paths; the final proportional drawing refinement
  is separately checked by browser geometry assertion and independent UX assessment.
- Browser source/captures, interaction script/results, original and subsequent code/UX
  reports are retained in the workstation harness cache under BoardClimb/2026-11-17-mvp
  and reviews/BoardClimb. Initial UX evidence was incomplete; later reviews scored 8.5
  and 8.3, with the remaining proportion defect corrected for the delivery assessment.
  The fixed target is 8/10. Report the latest delivery assessment with the handoff;
  earlier scores do not establish the final state.
- Capture comparisons preserve the original evidence. An intermediate hidden-heading
  finding was fixed by excluding inactive preserved screens from active landmarks.
  Latest comparisons have no new/increased findings. axe-core was not installed;
  screen-reader and real native accessibility checks remain unexecuted.
- The acceptance workbook was generated and structurally validated, not opened in Excel;
  row heights are estimates. Its blank result cells are not execution or sign-off.
- Hosted CI execution is separate from local evidence; inspect the run for this commit
  on GitHub. Source rights/transitive-license review and hardware proof are not CI gates.

## Remaining evidence for the owner

1. On the MacBook, build/install the iPhone Release app using the guide. Verify it
   launches without Metro and persists SQLite records across force-close/restart.
2. At each physical board, compare every LED/role, lock/range/reconnect behaviour,
   permission recovery and two-phone contention. Record model/layout/firmware and actual
   latency. No automatic relighting is permitted; unsupported takeover is not success.
3. Before public/commercial distribution, complete manufacturer/data-rights and complete
   dependency/asset provenance review. BoardSesh's snapshot invitation and Apache code
   license do not establish all manufacturer/commercial rights.

Optional/deferred: native backup/restore, live sync, accounts/backends and TopLogger
integration are not MVP prerequisites. History remains on this phone; no cross-device
transfer or tested backup guarantee is claimed.
