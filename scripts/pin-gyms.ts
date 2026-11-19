/**
 * Pins the combined gym list from the public-domain Climbing Boards dataset
 * (npm `@hangtime/climbing-boards`, Unlicense; provenance in docs/licensing-inventory.md).
 *
 *   bun scripts/pin-gyms.ts <unpacked package dir> <package@version>
 *
 * Reads the Kilter, Tension and MoonBoard GeoJSON files, keeps only public gyms and the fields the map shows,
 * merges listings of the same place and writes packages/provider-snapshots/data/gyms.json.
 */
import { join } from 'node:path';
import {
  mergeGyms,
  parseKilterGyms,
  parseMoonBoardGyms,
  parseTensionGyms,
} from '@boardclimb/provider-snapshots';

const [dir, source] = process.argv.slice(2);
if (!dir || !source)
  throw new Error('Usage: bun scripts/pin-gyms.ts <unpacked package dir> <package@version>');

async function features(name: string): Promise<[]> {
  const collection = (await Bun.file(join(dir as string, 'geojson', name)).json()) as { features?: [] };
  if (!Array.isArray(collection.features)) throw new Error(`${name} is not a GeoJSON feature collection`);
  return collection.features;
}

const kilter = parseKilterGyms(await features('kilterboardapp.geojson'));
const tension = parseTensionGyms(await features('tensionboardapp2.geojson'));
const moonboard = parseMoonBoardGyms(await features('moonboard.geojson'));
const gyms = mergeGyms([...kilter, ...tension, ...moonboard]);
const takenAt = new Date().toISOString().slice(0, 10);
await Bun.write(
  new URL('../packages/provider-snapshots/data/gyms.json', import.meta.url),
  `${JSON.stringify({ source, takenAt, gyms })}\n`,
);
// Written in the repo's format so `bun fmt --check` stays clean after a re-pin.
await Bun.spawn([process.execPath, 'fmt', '--no-script', 'packages/provider-snapshots/data/gyms.json'], {
  cwd: new URL('..', import.meta.url).pathname,
}).exited;
const shared = gyms.filter((gym) => new Set(gym.boards.map((b) => b.manufacturer)).size > 1).length;
console.log(
  `pinned ${gyms.length} gyms from ${source} (kilter ${kilter.length}, tension ${tension.length}, moonboard ${moonboard.length}; ${shared} with boards from more than one manufacturer)`,
);
