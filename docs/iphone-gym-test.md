# iPhone build and gym test

Owner: product owner/climber. Status: prepared, **not executed**. Record results in
[testing/iphone-gym-test.xlsx](testing/iphone-gym-test.xlsx) and keep its specification
beside it. Automated fixture tests and Android compilation are not physical-board evidence.

## Build on your MacBook (Personal Team)

Prerequisites: current Xcode with its iOS platform installed, Xcode command-line tools,
CocoaPods, Node from `.node-version` and Bun 1.4.4. Use your own Apple Account in Xcode;
no Expo account or paid Apple Developer membership is required for local Personal Team
signing. Free provisioning expires after seven days; rebuild if it expires. Keep
Apple credentials and signing files out of the repository.

```sh
git clone git@github.com:Joeghanoe/Boardclimb.git
cd Boardclimb
bun install --frozen-lockfile
bun run verify
cd apps/mobile
bun run ios:device
```

The command runs Expo on Node, generates `ios/`, installs pods and builds a **Release**
app with JavaScript bundled. It must run on the Mac, with the iPhone plugged in,
unlocked and trusted. Enable Developer Mode on the phone when iOS asks. If signing
is not configured, open `apps/mobile/ios/BoardClimb.xcworkspace` in Xcode, select the
BoardClimb target, enable automatic signing and select your Personal Team. If the
bundle identifier is unavailable, choose your own unique identifier in app.json
before regenerating. Select the attached iPhone and build again. Do not commit the
generated signing settings or provisioning profiles.

Before leaving home, disconnect the Mac/Metro and launch the installed app again.
It must open by itself. If it asks for a development server, you installed a Debug
build; rebuild with `--configuration Release` as above.

Reference: [Expo local native builds](https://docs.expo.dev/guides/local-app-development/)
and [Personal Team/free account explanation](https://expo.dev/blog/apple-developer-program-explained-free-vs-paid).
The iOS build and on-phone launch have not been executed on this Windows/WSL host.

## Prepare catalogs before the gym

1. On Wi-Fi, choose each board you will test: manufacturer, model, exact layout, wall
   size and angle. For Aurora layouts, all hold sets listed for that size/layout are
   assumed present; do not light a gym wall whose hold sets do not match.
2. Wait for the first catalog download. Kilter Original is approximately 84 MB on the
   wire and 207 MB decoded in the recorded snapshot; other layouts vary. Leave the
   app open. Downloads are nightly snapshots and are not a live manufacturer feed.
3. Open at least two problems on each selected layout. Their hold details and diagrams
   are now saved in the normal app cache. Downloaded search spans problems you have
   browsed on this phone, not every row in every remote catalog.
4. Force-close and reopen in airplane mode with Bluetooth off. Confirm cached names,
   grades, ratings, diagrams and log controls still work. Turn airplane mode off
   before scanning at the gym.
5. Use designated test problems for logs: recording Attempt/Top/Flash writes real
   local history. Tell the tester what was logged; remove test contributions through
   the visible controls afterwards. Do not uninstall to clean up genuine history.

## At each physical board

Obtain the wall users' agreement before changing LEDs. Record manufacturer, model,
layout, size, angle, controller firmware if available, app revision and iOS version.
Do not put hardware addresses or personal climbing histories in shared diagnostics.

- Opening, filtering, logging, selecting and connecting must leave existing LEDs
  unchanged. Only tap **Light up** when the wall is clear for the test.
- Check **every** lit hold and its role against the chosen problem, including start,
  finish and feet. The phone reports sent from this phone, not a confirmed shared state.
- Browse another problem; LEDs must stay on the previous one. Log an attempt; they
  must still stay unchanged.
- Lock/unlock and walk out of range/back. Reconnect if necessary. Nothing may relight
  until Light up is tapped again.
- With a second consenting phone, test which connection wins. Record rejection,
  concurrent control or takeover exactly as observed. Unknown support is not success.
- If the pattern is wrong, stop sending, use the official app for climbing and record
  the layout, firmware and failed step. Do not compensate by choosing a wrong layout.

The workbook has expected outcomes and blank result/evidence fields for these cases.
Bluetooth readback, simultaneous connections and takeover remain unknown until these
checks run on each manufacturer's controller. Do not use this build as verified gym
hardware support before that evidence exists.

## Troubleshooting

- **No controllers:** check Bluetooth permission in iPhone Settings, radio on, board
  powered and nearby. Board selection is manual; the app never picks the strongest signal.
- **No catalog:** keep the app open on Wi-Fi and retry; allow space for compressed plus
  decoded files. Existing cached details and history remain available after failures.
- **Connection refused:** disconnect the other app/phone and retry. Do not assume takeover.
- **Light up rejected:** confirm the exact layout, size and angle. Empty/partial/unknown
  protocol mappings are intentionally refused rather than sending an incomplete pattern.
- **New phone/backup:** history lives on this phone. Backup/restore and cross-device sync
  are not provided or claimed by this build.
