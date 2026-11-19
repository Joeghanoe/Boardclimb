# ADR-0007: One gym map for Kilter, MoonBoard and Tension

- **Status:** Accepted for private gym testing.
- **Date:** 2026-11-19
- **Authority:** The product owner asked for a map feature that combines the three manufacturers' gym maps
  (reference: a Kilter gym page listing its walls and a Climb button). On 2026-11-19 they chose a bundled,
  pinned copy of the public dataset over a runtime fetch, and `react-native-maps` over MapLibre or a list only.
- **Related:** ADR-0001 (nothing lights or logs without an explicit action), ADR-0002 (boundaries), ADR-0005 (pinned public data).

## Context

Each manufacturer's app has its own gym map. A climber travelling, or at a gym with boards from several
manufacturers, has to check three apps. None of the BoardSesh snapshots carry gyms. MoonBoard removed its public
map endpoint in May 2026; Kilter's needs a signed-in account.

The npm package `@hangtime/climbing-boards` (Unlicense, public domain) republishes all three maps as GeoJSON,
refreshed daily by the author's own scraper: about 1,160 Kilter gyms with each listed wall (board model, fixed angle),
420 Tension gyms (name and point only) and 1,500 MoonBoard markers (frozen at May 2026). About 730 of those
MoonBoard markers are home boards, which are private people's locations.

## Decision

1. **Data:** `scripts/pin-gyms.ts` reads the three GeoJSON files from an unpacked package version and writes
   `packages/provider-snapshots/data/gyms.json` (about 0.6 MB). It keeps only the fields the map shows. It drops
   non-commercial MoonBoard markers, MoonBoard descriptions and photos, and Kilter wall serial numbers. The app calls
   no gym endpoint and works offline. Re-pinning is a human running the script and committing the result.
2. **Merging:** listings of one place by different manufacturers become one gym. Two listings are one place within
   40 m whatever their names, or within 250 m when their names share a distinctive word. Two listings from the same
   manufacturer are never merged. The first listing's name wins. Order: Kilter, Tension, MoonBoard, richest data first.
3. **Boundaries:** `Gym`, `GymBoard` and `distanceKm` live in `domain`. The `GymSource` port and the `GymFinder` use
   case (filter by manufacturer and words, nearest first, limited) live in `application`. `PinnedGymSource` and the
   listing parsers live in `provider-snapshots`. Screens see only `GymFinder`.
4. **Map:** `react-native-maps` 1.29 (MIT) draws Apple Maps on iOS, with no key, and Google Maps on Android. Android
   reads `GOOGLE_MAPS_ANDROID_API_KEY` from the build environment through `app.config.ts`. The key is never committed
   (`.env.example`). The browser preview shows the same gyms as a list (`GymMapView.web.tsx`). The map draws only the
   150 gyms nearest its centre.
5. **Location:** opening the gym map asks for location (the product owner's choice, 2026-11-19). The first visit
   in an app session starts zoomed out around the climber; later visits keep where the map was left, and **Near me**
   returns to the climber. `expo-location` asks on both platforms and reads one position; the map only shows the climber's dot after that. If location is
   refused, the map stays on western Europe and says to search for a city. The position stays on the phone and is
   not stored.
6. **Climb:** a board's **Climb** opens the board screen, which scans for controllers straight away (the product
   owner's choice, 2026-11-19). The layout is prefilled only when the listing points to exactly one: the named
   board model at its fixed angle. Otherwise the controller's reported layout or the climber's current one is
   suggested, and the layout picker, preset to the gym's manufacturer, board and angle, is the fallback. The climber
   still picks the controller (never auto-selected) and nothing is lit or logged from the map.

## Consequences

- The map is as fresh as the last pin. MoonBoard gyms stay at May 2026 until a source returns. A gym missing from
  a manufacturer's own map is missing here too.
- The merge can join two nearby gyms whose names share a word, or miss a join when names differ and the points are
  more than 40 m apart. Both show as an extra or a combined marker; neither changes any log or board.
- Android release builds need a restricted Google Maps key; without one the map is blank on Android.
- A new native module means a new development client build.

## Rejected

- **Runtime fetch** of the GeoJSON from GitHub or npm: a new runtime endpoint, and empty offline until the first download.
- **MapLibre with OSM tiles:** no Google key, but a heavier module and a tile provider whose terms need their own review.
- **Calling each manufacturer's API:** Kilter needs credentials (AGENTS.md: ask before storing any) and MoonBoard's endpoint is gone.
