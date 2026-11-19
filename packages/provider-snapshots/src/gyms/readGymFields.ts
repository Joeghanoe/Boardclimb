/** Field readers for untrusted listing properties: wrong types read as null instead of throwing. */
export function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Some listings wrap names in literal quotes.
  const trimmed = value
    .trim()
    .replace(/^"+|"+$/g, '')
    .trim();
  return trimmed === '' ? null : trimmed;
}

export function number(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

export function flag(value: unknown): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}

/** Rounded to about a metre; a point at 0,0 or out of range is a listing without a real location. */
export function coordinates(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  const lat = number(latitude);
  const lng = number(longitude);
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { latitude: Math.round(lat * 1e5) / 1e5, longitude: Math.round(lng * 1e5) / 1e5 };
}
