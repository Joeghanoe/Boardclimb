/** The part of a GeoJSON point feature the gym readers use; properties are checked field by field. */
export interface GeoJsonFeature {
  id?: string | number;
  properties?: Record<string, unknown> | null;
}
