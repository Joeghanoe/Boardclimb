import type { Manufacturer } from '@boardclimb/domain';

const NAMES: Record<Manufacturer, string> = {
  kilter: 'Kilter',
  moonboard: 'MoonBoard',
  tension: 'Tension',
};

export function describeManufacturer(manufacturer: Manufacturer): string {
  return NAMES[manufacturer];
}
