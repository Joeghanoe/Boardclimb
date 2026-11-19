import type { Gym } from '@boardclimb/domain';
import type { GeoJsonFeature } from './GeoJsonFeature';
import { coordinates, text } from './readGymFields';

/** Tension's public gym listing names the gym and its location, not its walls. */
export function parseTensionGyms(features: readonly GeoJsonFeature[]): Gym[] {
  const gyms: Gym[] = [];
  for (const feature of features) {
    const p = feature.properties ?? {};
    const id = text(String(p.id ?? feature.id ?? ''));
    const name = text(p.name);
    const point = coordinates(p.latitude, p.longitude);
    if (!id || !name || !point) continue;
    gyms.push({
      id: `tension:${id}`,
      name,
      city: null,
      country: null,
      ...point,
      boards: [
        {
          manufacturer: 'tension',
          name: null,
          boardName: null,
          angleDegrees: null,
          adjustable: null,
          lights: true,
        },
      ],
    });
  }
  return gyms;
}
