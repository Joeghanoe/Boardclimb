import type { BoardConfiguration, Manufacturer } from '@boardclimb/domain';
import hardware from '../../data/hardware.json';
import type { HardwareIndex } from './HardwareIndex';

type Placement = (typeof hardware.placements)[number];

const EMPTY = { all: [], byId: new Map<number, Placement>() } as const;
const built = new Map<Manufacturer, HardwareIndex>();

function firstBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T> {
  const map = new Map<K, T>();
  for (const row of rows) if (!map.has(key(row))) map.set(key(row), row);
  return map;
}

function configurations(manufacturer: Manufacturer, boardId: string): BoardConfiguration[] {
  const combinations = new Set(
    hardware.combinations
      .filter((c) => c.board_type === manufacturer)
      .map((c) => `${c.layout_id}-${c.product_size_id}`),
  );
  const angles =
    manufacturer === 'moonboard' ? [25, 40] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
  const configs: BoardConfiguration[] = [];
  for (const layout of hardware.layouts.filter(
    (l) => l.board_type === manufacturer && String(l.product_id) === boardId,
  ))
    for (const size of hardware.sizes.filter(
      (s) => s.board_type === manufacturer && String(s.product_id) === boardId,
    )) {
      if (!combinations.has(`${layout.id}-${size.id}`)) continue;
      for (const angle of angles)
        configs.push({
          id: `bs-${layout.id}-${size.id}-${angle}`,
          boardId,
          manufacturer,
          name: `${layout.name} · ${size.name}`,
          angleDegrees: angle,
        });
    }
  return configs;
}

/**
 * Built once per manufacturer: the bundled metadata never changes at run time, and a linear scan of 14,000
 * placements for every hold of every opened problem is the slowest part of reading a snapshot. The first match
 * wins, as `Array.find` did.
 */
export function indexHardware(manufacturer: Manufacturer): HardwareIndex {
  const cached = built.get(manufacturer);
  if (cached) return cached;
  const configurationsByBoard = new Map<string, BoardConfiguration[]>();
  for (const product of hardware.products.filter((p) => p.board_type === manufacturer))
    configurationsByBoard.set(String(product.id), configurations(manufacturer, String(product.id)));
  const grids = new Map<string, { all: Placement[]; byId: Map<number, Placement> }>();
  for (const point of hardware.placements) {
    if (point.board_type !== manufacturer) continue;
    const key = `${point.layout_id}-${point.product_size_id}`;
    let grid = grids.get(key);
    if (!grid) grids.set(key, (grid = { all: [], byId: new Map() }));
    grid.all.push(point);
    if (!grid.byId.has(point.id)) grid.byId.set(point.id, point);
  }
  const index: HardwareIndex = {
    configurationsByBoard,
    configurationIds: new Set([...configurationsByBoard.values()].flat().map((c) => c.id)),
    sizes: firstBy(
      hardware.sizes.filter((s) => s.board_type === manufacturer),
      (s) => s.id,
    ),
    gradesByDifficulty: firstBy(
      hardware.grades.filter((g) => g.board_type === manufacturer),
      (g) => g.difficulty,
    ),
    roles: firstBy(
      hardware.roles.filter((r) => r.board_type === manufacturer),
      (r) => r.id,
    ),
    placements: (layout, size) => grids.get(`${layout}-${size}`) ?? EMPTY,
  };
  built.set(manufacturer, index);
  return index;
}
