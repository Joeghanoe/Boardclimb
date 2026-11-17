import { describe, expect, it } from 'bun:test';
import type { BoardGeometry } from '@boardclimb/domain';
import { boardHoldShapes } from './boardHoldShapes';

const bounds = { left: 10, right: 110, bottom: 20, top: 220 };

describe('boardHoldShapes (UI-1)', () => {
  it('places holds with the top of the board at the top of the canvas', () => {
    const [hold] = boardHoldShapes({ bounds, holds: [{ holdId: 'a', x: 30, y: 200, radius: 4 }] });
    expect(hold).toEqual({ holdId: 'a', x: 20, y: 20, radius: 4, points: null, extent: 0.55 });
  });

  it('scales a traced silhouette by the hold radius and rings it outside its farthest point', () => {
    const [hold] = boardHoldShapes({
      bounds,
      holds: [{ holdId: 'b', x: 60, y: 120, radius: 2, outline: [1, 0, 0, -2, -1, 0] }],
    });
    expect(hold!.points).toBe('52,100 50,96 48,100');
    expect(hold!.extent).toBe(2);
  });

  it('keeps the minimum ring for a small silhouette and still draws an empty one as a silhouette', () => {
    const shapes = boardHoldShapes({
      bounds,
      holds: [
        { holdId: 'c', x: 60, y: 120, radius: 1, outline: [0.1, 0, 0, 0.1, -0.1, 0] },
        { holdId: 'd', x: 60, y: 120, radius: 1, outline: [] },
      ],
    });
    expect(shapes.map((s) => s.extent)).toEqual([0.6, 0.6]);
    expect(shapes[1]!.points).toBe('');
  });

  it('shapes a full commercial layout of 2,000 holds inside the frame budget (CODE.9)', () => {
    const outline = Array.from({ length: 24 }, (_, index) => Math.sin(index));
    const geometry: BoardGeometry = {
      bounds,
      holds: Array.from({ length: 2000 }, (_, index) => ({
        holdId: String(index),
        x: 10 + (index % 100),
        y: 20 + Math.floor(index / 10),
        radius: 4,
        outline,
      })),
    };
    const started = performance.now();
    const shapes = boardHoldShapes(geometry);
    expect(performance.now() - started).toBeLessThan(250);
    expect(new Set(shapes.map((s) => s.holdId)).size).toBe(2000);
  });
});
