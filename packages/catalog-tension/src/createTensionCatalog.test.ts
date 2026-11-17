import { describe, expect, it } from 'bun:test';
import { runCatalogContract } from '@boardclimb/catalog-core/testing';
import { createSampleTensionSource } from './createSampleTensionSource';
import { createTensionCatalog } from './createTensionCatalog';

runCatalogContract('Tension catalog over the sample bulk-only source (AC-015)', () => ({
  catalog: createTensionCatalog(createSampleTensionSource()),
  configuration: {
    id: 'sample-tension-mirror',
    boardId: 'sample-tension',
    manufacturer: 'tension',
    name: 'Sample mirror layout',
    angleDegrees: 40,
  },
  expectedProblemCount: 40,
}));

describe('Tension catalog without a verified source', () => {
  it('reports provider_unverified rather than inventing data (A2)', async () => {
    await expect(createTensionCatalog().listBoards()).rejects.toMatchObject({ code: 'provider_unverified' });
  });
});
