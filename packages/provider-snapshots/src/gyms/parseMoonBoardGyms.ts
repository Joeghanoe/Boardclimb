import type { Gym } from '@boardclimb/domain';
import type { GeoJsonFeature } from './GeoJsonFeature';
import { coordinates, flag, text } from './readGymFields';

/**
 * MoonBoard's public map. Only commercial places are kept: the other markers are home boards, and a
 * private person's address is not something this app shows. Descriptions and photos are not kept either.
 * The listing has no ids, and several places can share a point (a city centre), so the id is the point and the
 * name; a repeat of the same name at the same point is the same listing and is kept once.
 */
export function parseMoonBoardGyms(features: readonly GeoJsonFeature[]): Gym[] {
  const gyms: Gym[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const p = feature.properties ?? {};
    if (flag(p.IsCommercial) !== true) continue;
    const name = text(p.Name);
    const point = coordinates(p.Latitude, p.Longitude);
    if (!name || !point) continue;
    const id = `moonboard:${point.latitude},${point.longitude}:${name.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    gyms.push({
      id,
      name,
      city: null,
      country: null,
      ...point,
      boards: [
        {
          manufacturer: 'moonboard',
          name: null,
          boardName: 'MoonBoard',
          angleDegrees: null,
          adjustable: null,
          lights: flag(p.IsLed),
        },
      ],
    });
  }
  return gyms;
}
