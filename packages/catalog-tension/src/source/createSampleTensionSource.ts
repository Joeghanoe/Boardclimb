import { InMemoryProviderSource, buildSampleProviderData } from '@boardclimb/catalog-core';

/**
 * SAMPLE data shaped like a V-graded, unrated, bulk-only provider (one page, no cursor). It exists to exercise
 * the bulk fallback and the "no ratings" path. Made up; not the Tension catalog, and not a claim about it.
 */
export function createSampleTensionSource(): InMemoryProviderSource {
  return new InMemoryProviderSource(
    buildSampleProviderData({
      manufacturer: 'tension',
      gradeSystem: 'v',
      rated: false,
      problemsPerConfiguration: 40,
      boards: [
        {
          id: 'sample-tension',
          name: 'Sample Tension Board',
          configurations: [{ id: 'sample-tension-mirror', name: 'Sample mirror layout', angleDegrees: 40 }],
        },
      ],
    }),
    { pagination: 'none', ratings: false, supportedGradeSystems: ['v'], deltaSync: false },
  );
}
