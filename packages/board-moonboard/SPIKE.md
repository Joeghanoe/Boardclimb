# Integration status (2026-11-17)

Native composition now supplies a BoardSesh-derived device matcher and encoder over `react-native-ble-plx`. Byte vectors and scripted lifecycle scenarios pass. This is reference-derived support, not a successful physical-board test. Firmware, two-phone takeover, lock/reconnect and LEDs remain on the gym checklist; capabilities stay unknown.

The original spike checklist below is retained as the validation history. Statements that no implementation exists describe the original baseline, not the current native composition.

# MoonBoard controller: open spike

Status: **no verified MoonBoard BLE protocol.** By default `createMoonBoardController` recognises no device and
`lightUp` answers `protocol_unverified`. `sampleLedEncoder` is not a vendor protocol (ADR-0002 section 7).

To finish, with a physical MoonBoard (ADR-0002 A1, A4, A5, A7):

1. Find a verified source for the advertisement format and LED command layout (pinned revision and licence, or
   captures from the owner's own board). Record the source and date.
2. Implement a `DeviceMatcher` and a `LedEncoder` and pass them to `createMoonBoardController`.
3. Test on hardware: connect and light times, two-phone behaviour, phone lock and reconnect. Move capabilities
   from 'unknown' only for what was observed, and record the firmware.
4. Choose the BLE library for `BleTransport` in its own ADR (ADR-0004 risks).
5. Add the licensing row in `docs/licensing-inventory.md` (NFR-011).
