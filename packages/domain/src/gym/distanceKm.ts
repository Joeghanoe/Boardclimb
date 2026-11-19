import type { GeoPoint } from './GeoPoint';

const EARTH_RADIUS_KM = 6371.0088;
const RADIANS = Math.PI / 180;

/** Great-circle distance between two points (haversine), in kilometres. */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = (to.latitude - from.latitude) * RADIANS;
  const dLng = (to.longitude - from.longitude) * RADIANS;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.latitude * RADIANS) * Math.cos(to.latitude * RADIANS) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
