import { describe, expect, it } from 'bun:test';
import { runCatalogContract } from '@boardclimb/catalog-core/testing';
import { createMoonBoardCatalog, createSampleMoonBoardSource } from '@boardclimb/catalog-moonboard';

runCatalogContract('MoonBoard catalog over the sample source (AC-015)', () => ({
  catalog: createMoonBoardCatalog(createSampleMoonBoardSource()),
  configuration: {
    id: 'sample-moonboard-set-a',
    boardId: 'sample-moonboard',
    manufacturer: 'moonboard',
    name: 'Sample hold set A',
    angleDegrees: 40,
  },
  expectedProblemCount: 60,
}));

describe('MoonBoard catalog without a verified source', () => {
  it('reports provider_unverified rather than inventing data (A2)', async () => {
    await expect(createMoonBoardCatalog().listBoards()).rejects.toMatchObject({
      code: 'provider_unverified',
    });
  });
});
