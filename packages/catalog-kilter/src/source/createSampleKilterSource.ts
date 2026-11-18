import { InMemoryProviderSource, buildSampleProviderData } from '@boardclimb/catalog-core';

/**
 * SAMPLE data shaped like a V-graded, rated, cursor-paged provider. Made up; not Kilter's catalog.
 * The capabilities are what this stand-in does, not a claim about the vendor.
 */
export function createSampleKilterSource(): InMemoryProviderSource {
  return new InMemoryProviderSource(
    buildSampleProviderData({
      manufacturer: 'kilter',
      gradeSystem: 'v',
      rated: true,
      problemsPerConfiguration: 60,
      boards: [
        {
          id: 'sample-kilter-original',
          name: 'Sample Kilter Board',
          configurations: [
            { id: 'sample-kilter-12x12', name: 'Sample 12 x 12', angleDegrees: 40 },
            { id: 'sample-kilter-16x12', name: 'Sample 16 x 12', angleDegrees: 35 },
          ],
        },
      ],
    }),
    { pagination: 'cursor', ratings: true, supportedGradeSystems: ['v'], deltaSync: false },
  );
}
