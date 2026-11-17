import { describe, expect, it } from 'bun:test';
import hardware from '../data/hardware.json';
import { indexHardware } from './indexHardware';

const MANUFACTURERS = ['kilter', 'moonboard', 'tension'] as const;

describe('indexHardware', () => {
  it('builds each manufacturer once, so opening a problem never rescans the bundled tables', () => {
    for (const manufacturer of MANUFACTURERS)
      expect(indexHardware(manufacturer)).toBe(indexHardware(manufacturer));
    expect(indexHardware('kilter')).not.toBe(indexHardware('tension'));
  });

  it('finds every placement of its manufacturer under its own layout and size, in file order', () => {
    for (const manufacturer of MANUFACTURERS) {
      const index = indexHardware(manufacturer);
      const rows = hardware.placements.filter((p) => p.board_type === manufacturer);
      for (const point of rows)
        expect(index.placements(point.layout_id, point.product_size_id).byId.get(point.id)).toBe(point);
      const [first] = rows;
      if (!first) continue;
      expect(index.placements(first.layout_id, first.product_size_id).all).toEqual(
        rows.filter((p) => p.layout_id === first.layout_id && p.product_size_id === first.product_size_id),
      );
    }
    expect(indexHardware('kilter').placements(999, 999).all).toEqual([]);
  });

  it('never mixes grades, roles or sizes across manufacturers (FR-007)', () => {
    for (const manufacturer of MANUFACTURERS) {
      const index = indexHardware(manufacturer);
      for (const grade of hardware.grades.filter((g) => g.board_type === manufacturer))
        expect(index.gradesByDifficulty.get(grade.difficulty)?.board_type).toBe(manufacturer);
      for (const role of hardware.roles.filter((r) => r.board_type === manufacturer))
        expect(index.roles.get(role.id)).toBe(role);
      for (const size of hardware.sizes.filter((s) => s.board_type === manufacturer))
        expect(index.sizes.get(size.id)).toBe(size);
    }
  });

  it('lists only layout and size pairs the hardware table says exist', () => {
    for (const manufacturer of MANUFACTURERS)
      for (const id of indexHardware(manufacturer).configurationIds) {
        const [, layout, size] = /^bs-(\d+)-(\d+)-\d+$/.exec(id)!.map(Number);
        expect(
          hardware.combinations.some(
            (c) => c.board_type === manufacturer && c.layout_id === layout && c.product_size_id === size,
          ),
        ).toBe(true);
      }
  });
});
