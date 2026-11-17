import { expect, it } from 'bun:test';
import { fitBoardCanvas } from './fitBoardCanvas';

it.each([320, 390, 768, 1280])(
  'UI-1: the complete board fits at %s points without cropping or distortion',
  (width) => {
    const bounds = { left: 0, right: 144, bottom: 0, top: 180 };
    const canvas = fitBoardCanvas(width - 32, 300, bounds);
    expect(canvas.width).toBeLessThanOrEqual(width - 32);
    expect(canvas.height).toBeLessThanOrEqual(300);
    expect(canvas.width / canvas.height).toBeCloseTo(144 / 180);
    expect(canvas.width).toBeGreaterThan(0);
  },
);
