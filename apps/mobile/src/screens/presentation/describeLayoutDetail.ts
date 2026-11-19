/** The layout under its board's name, without repeating that name: "Kilter Board Original · 8 x 12" becomes "8 x 12". */
export function describeLayoutDetail(
  boardName: string,
  layoutName: string,
  angleDegrees: number | null,
): string {
  const trimmed = layoutName.startsWith(boardName)
    ? layoutName.slice(boardName.length).replace(/^[\s·,–-]+/, '')
    : layoutName;
  const parts = [trimmed, angleDegrees === null ? '' : `${angleDegrees}°`].filter((part) => part !== '');
  return parts.join('  ·  ');
}
