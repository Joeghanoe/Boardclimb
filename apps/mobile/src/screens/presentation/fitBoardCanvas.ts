import type { BoardBounds } from '@boardclimb/domain';

/** Fit the entire board without changing its proportions or cropping its feet. */
export function fitBoardCanvas(
  width: number,
  height: number,
  bounds: BoardBounds,
): { width: number; height: number } {
  const boardWidth = Math.max(1, bounds.right - bounds.left);
  const boardHeight = Math.max(1, bounds.top - bounds.bottom);
  const scale = Math.min(Math.max(1, width) / boardWidth, Math.max(1, height) / boardHeight);
  return { width: boardWidth * scale, height: boardHeight * scale };
}
