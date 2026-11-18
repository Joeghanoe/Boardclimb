import type { BoardBounds } from './BoardBounds';

export function isBoardBounds(value: unknown): value is BoardBounds {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const b = value as Partial<BoardBounds>;
  return (
    [b.left, b.right, b.bottom, b.top].every((v) => typeof v === 'number' && Number.isFinite(v)) &&
    b.right! > b.left! &&
    b.top! > b.bottom!
  );
}
