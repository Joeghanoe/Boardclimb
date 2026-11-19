import { describe, expect, it } from 'bun:test';
import type { Gym } from '@boardclimb/domain';
import { mergeGyms } from '@boardclimb/provider-snapshots';

describe('merging gym listings at ten times the expected size (CODE.9)', () => {
  it('merges 25,000 listings in under 2 s', () => {
    const many: Gym[] = Array.from({ length: 25_000 }, (_, i) => ({
      id: String(i),
      name: `Gym ${i}`,
      city: null,
      country: null,
      latitude: -60 + (i % 120) + (i % 7) * 0.001,
      longitude: -170 + ((i * 7) % 340),
      boards: [
        {
          manufacturer: i % 3 ? 'kilter' : 'tension',
          name: null,
          boardName: null,
          angleDegrees: null,
          adjustable: null,
          lights: true,
        },
      ],
    }));
    const started = performance.now();
    const merged = mergeGyms(many);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(merged.length).toBeLessThanOrEqual(many.length);
  });
});
