import { describe, expect, it } from 'bun:test';
import { runCatalogContract } from '@boardclimb/catalog-core/testing';
import { createKilterCatalog } from './createKilterCatalog';
import { createSampleKilterSource } from './createSampleKilterSource';

runCatalogContract('Kilter catalog over the sample source (AC-015)', () => {
  const catalog = createKilterCatalog(createSampleKilterSource());
  return {
    catalog,
    configuration: {
      id: 'sample-kilter-12x12',
      boardId: 'sample-kilter-original',
      manufacturer: 'kilter',
      name: 'Sample 12 x 12',
      angleDegrees: 40,
    },
    expectedProblemCount: 60,
  };
});

describe('Kilter catalog without a verified source', () => {
  it('reports provider_unverified rather than inventing data (A2)', async () => {
    await expect(createKilterCatalog().listBoards()).rejects.toMatchObject({ code: 'provider_unverified' });
  });
});
