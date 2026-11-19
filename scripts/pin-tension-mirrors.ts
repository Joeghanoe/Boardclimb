/**
 * Pins which Tension placement mirrors which, from a downloaded BoardSesh catalog snapshot
 * (https://snapshots.boardsesh.com/board-snapshots/v1-catalog/manifest.json; provenance in docs/licensing-inventory.md).
 *
 *   bun scripts/pin-tension-mirrors.ts <catalog.db> <artifact key>
 *
 * A placement maps to the placement in the same layout whose hole is its hole's mirrored hole. Placements
 * without one are left out, so a problem that uses them cannot be flipped (nothing is guessed).
 */
import { Database } from 'bun:sqlite';

const [path, artifact] = process.argv.slice(2);
if (!path || !artifact)
  throw new Error('Usage: bun scripts/pin-tension-mirrors.ts <catalog.db> <artifact key>');
const db = new Database(path, { readonly: true });
const rows = db
  .query<{ id: number; mirror: number }, []>(
    `SELECT p.id AS id, q.id AS mirror
     FROM board_placements p
     JOIN board_holes h ON h.board_type = p.board_type AND h.id = p.hole_id
     JOIN board_placements q ON q.board_type = p.board_type AND q.layout_id = p.layout_id AND q.hole_id = h.mirrored_hole_id
     WHERE p.board_type = 'tension' AND h.mirrored_hole_id IS NOT NULL
     ORDER BY p.id`,
  )
  .all();
const mirrors = Object.fromEntries(rows.map((row) => [String(row.id), row.mirror]));
await Bun.write(
  new URL('../packages/provider-snapshots/data/tension-mirrors.json', import.meta.url),
  `${JSON.stringify({ source: artifact, mirrors }, null, 0)}\n`,
);
console.log(`pinned ${rows.length} Tension mirror placements from ${artifact}`);
