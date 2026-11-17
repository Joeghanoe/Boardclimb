import { InMemoryProviderSource, buildSampleProviderData } from '@boardclimb/catalog-core';

/**
 * SAMPLE data shaped like a Font-graded, rated, page-numbered provider. Made up; not the MoonBoard catalog.
 * The capabilities are what this stand-in does, not a claim about the vendor.
 */
export function createSampleMoonBoardSource(): InMemoryProviderSource {
  return new InMemoryProviderSource(
    buildSampleProviderData({
      manufacturer: 'moonboard',
      gradeSystem: 'font',
      rated: true,
      problemsPerConfiguration: 60,
      boards: [
        {
          id: 'sample-moonboard',
          name: 'Sample MoonBoard',
          configurations: [
            { id: 'sample-moonboard-set-a', name: 'Sample hold set A', angleDegrees: 40 },
            { id: 'sample-moonboard-set-b', name: 'Sample hold set B', angleDegrees: 40 },
          ],
        },
      ],
    }),
    { pagination: 'page', ratings: true, supportedGradeSystems: ['font'], deltaSync: false },
  );
}
