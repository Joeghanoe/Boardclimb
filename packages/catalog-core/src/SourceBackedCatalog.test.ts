import { describe, expect, it } from 'bun:test';
import type { BoardConfiguration } from '@boardclimb/domain';
import { CatalogError } from './CatalogError';
import { InMemoryProviderSource } from './InMemoryProviderSource';
import { SourceBackedCatalog } from './SourceBackedCatalog';
import { UnverifiedProviderSource } from './UnverifiedProviderSource';
import { sampleProblemRecords } from './sampleProblemRecords';
import { runCatalogContract } from './testing';

const configuration: BoardConfiguration = {
  id: 'cfg',
  boardId: 'board',
  manufacturer: 'kilter',
  name: 'Sample layout',
  angleDegrees: 40,
};

function source(
  pagination: 'cursor' | 'none',
  records = sampleProblemRecords({ count: 20, gradeSystem: 'v', rated: true, idPrefix: 't' }),
) {
  return new InMemoryProviderSource(
    {
      boards: [{ id: 'board', manufacturer: 'kilter', name: 'Sample board' }],
      configurations: [configuration],
      problems: { cfg: records },
    },
    { pagination, ratings: true, supportedGradeSystems: ['v'], deltaSync: false },
  );
}

runCatalogContract('SourceBackedCatalog over a cursor source', () => ({
  catalog: new SourceBackedCatalog('kilter', source('cursor')),
  configuration,
  expectedProblemCount: 20,
}));

runCatalogContract('SourceBackedCatalog over a bulk-only source', () => ({
  catalog: new SourceBackedCatalog('kilter', source('none')),
  configuration,
  expectedProblemCount: 20,
}));

describe('SourceBackedCatalog decides what a source answer means (CODE.5)', () => {
  it('drops malformed records, counts them and keeps the rest', async () => {
    const good = sampleProblemRecords({ count: 2, gradeSystem: 'v', rated: true, idPrefix: 'ok' });
    const bad = [
      { id: '', name: 'No id', gradeSystem: 'v', gradeLabel: 'V3', rating: 3 },
      { id: 'x1', name: 'Odd system', gradeSystem: 'yds', gradeLabel: '5.10', rating: 3 },
      { id: 'x2', name: 'Rating off the scale', gradeSystem: 'v', gradeLabel: 'V3', rating: 9 },
    ].map((record) => ({ ...record, holds: [] }));
    const catalog = new SourceBackedCatalog('kilter', source('cursor', [...good, ...bad]));
    const page = await catalog.listProblems(configuration, { pageSize: 50 });
    expect(page.items).toHaveLength(2);
    expect(page.skipped).toBe(3);
  });

  it('refuses a problem detail without a usable hold mapping', async () => {
    const records = sampleProblemRecords({ count: 1, gradeSystem: 'v', rated: true, idPrefix: 'h' });
    const first = records[0];
    if (!first) throw new Error('fixture');
    const catalog = new SourceBackedCatalog(
      'kilter',
      source('cursor', [{ ...first, holds: [{ holdId: 'h1', role: 'laser' }] }]),
    );
    await expect(catalog.getProblem(configuration, first.id)).rejects.toMatchObject({
      code: 'schema_mismatch',
    });
  });

  it('turns an unknown source failure into a coded error without leaking its message', async () => {
    const failing = source('cursor');
    failing.fetchProblemPage = () => Promise.reject(new Error('secret-token=abc'));
    const catalog = new SourceBackedCatalog('kilter', failing);
    const error = await catalog
      .listProblems(configuration, { pageSize: 5 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CatalogError);
    expect((error as CatalogError).code).toBe('provider_rejected');
    expect((error as CatalogError).message).not.toContain('secret');
  });

  it('says provider_unverified instead of inventing a vendor answer (ADR-0002 section 7)', async () => {
    const catalog = new SourceBackedCatalog('moonboard', new UnverifiedProviderSource('moonboard'));
    await expect(catalog.listBoards()).rejects.toMatchObject({ code: 'provider_unverified' });
    await expect(catalog.listProblems(configuration, { pageSize: 5 })).rejects.toMatchObject({
      code: 'provider_unverified',
    });
    expect(catalog.capabilities().supportedGradeSystems).toEqual([]);
  });
});
