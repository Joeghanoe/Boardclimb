import type { BoardGeometry } from '@boardclimb/domain';
import type { HoldShape } from './HoldShape';

/**
 * Everything about the drawn board that does not depend on the problem. A full layout has over a thousand
 * holds, so this runs once per geometry instead of on every render of the problem screen.
 */
export function boardHoldShapes(geometry: BoardGeometry): HoldShape[] {
  const { bounds } = geometry;
  return geometry.holds.map((hold) => {
    const x = hold.x - bounds.left;
    const y = bounds.top - hold.y;
    const outline = hold.outline;
    if (!outline) return { holdId: hold.holdId, x, y, radius: hold.radius, points: null, extent: 0.55 };
    let extent = 0.6;
    const points: string[] = [];
    for (let index = 0; index + 1 < outline.length; index += 2) {
      const dx = outline[index]!;
      const dy = outline[index + 1]!;
      extent = Math.max(extent, Math.hypot(dx, dy));
      points.push(`${x + dx * hold.radius},${y + dy * hold.radius}`);
    }
    return { holdId: hold.holdId, x, y, radius: hold.radius, points: points.join(' '), extent };
  });
}
