/**
 * Ascent count as a climber reads it at a glance: "1 ascent", "842 ascents", "17.8k ascents". Null for an unknown
 * count or none yet, so "0 ascents" never fills a row.
 */
export function formatAscents(count: number | undefined): string | null {
  if (count === undefined || count <= 0) return null;
  if (count === 1) return '1 ascent';
  if (count < 1000) return `${count} ascents`;
  const thousands = Math.round(count / 100) / 10;
  return `${String(thousands).replace(/\.0$/, '')}k ascents`;
}
