import type { Gym, GymBoard } from '@boardclimb/domain';
import type { GeoJsonFeature } from './GeoJsonFeature';
import { coordinates, flag, number, text } from './readGymFields';

/** Kilter's public gym listing: the gym and each listed wall with its board model and fixed angle. */
export function parseKilterGyms(features: readonly GeoJsonFeature[]): Gym[] {
  const gyms: Gym[] = [];
  for (const feature of features) {
    const p = feature.properties ?? {};
    const id = text(String(p.id ?? feature.id ?? ''));
    const name = text(p.name);
    const point = coordinates(p.latitude, p.longitude);
    if (!id || !name || !point) continue;
    const walls = Array.isArray(p.walls) ? (p.walls as Record<string, unknown>[]) : [];
    const boards: GymBoard[] = walls
      .filter((wall) => wall && wall.is_listed !== 0)
      .map((wall) => {
        const adjustable = flag(wall.is_adjustable);
        return {
          manufacturer: 'kilter',
          name: text(wall.name),
          boardName: text(wall.product_name),
          angleDegrees: adjustable === false ? number(wall.angle) : null,
          adjustable,
          lights: true,
        };
      });
    gyms.push({
      id: `kilter:${id}`,
      name,
      city: text(p.city),
      country: text(p.country),
      ...point,
      boards: boards.length > 0 ? boards : [unlisted('kilter')],
    });
  }
  return gyms;
}

function unlisted(manufacturer: GymBoard['manufacturer']): GymBoard {
  return { manufacturer, name: null, boardName: null, angleDegrees: null, adjustable: null, lights: null };
}
