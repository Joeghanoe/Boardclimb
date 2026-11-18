import { describe, expect, it } from 'bun:test';
import {
  InMemoryProviderSource,
  SourceBackedCatalog,
  UnverifiedProviderSource,
  buildSampleProviderData,
} from '@boardclimb/catalog-core';
import { BoardDirectory } from '@boardclimb/application';

function sampleSource() {
  return new InMemoryProviderSource(
    buildSampleProviderData({
      manufacturer: 'kilter',
      gradeSystem: 'v',
      rated: true,
      problemsPerConfiguration: 3,
      boards: [{ id: 'b', name: 'B', configurations: [{ id: 'c', name: 'C', angleDegrees: 40 }] }],
    }),
    { pagination: 'cursor', ratings: true, supportedGradeSystems: ['v'], deltaSync: false },
  );
}

describe('BoardDirectory (FR-001, FR-004)', () => {
  it('lists the boards that work and names the ones that do not, without hiding either', async () => {
    const directory = new BoardDirectory((manufacturer) =>
      manufacturer === 'kilter'
        ? new SourceBackedCatalog('kilter', sampleSource())
        : new SourceBackedCatalog(manufacturer, new UnverifiedProviderSource(manufacturer)),
    );
    const entries = await directory.list();
    expect(entries.map((entry) => entry.manufacturer)).toEqual(['kilter', 'moonboard', 'tension']);
    expect(entries[0]).toMatchObject({ ok: true });
    expect(entries[0]?.ok && entries[0].boards[0]?.configurations.length).toBeGreaterThan(0);
    expect(entries[1]).toEqual({ manufacturer: 'moonboard', ok: false, code: 'provider_unverified' });
    expect(entries[2]).toEqual({ manufacturer: 'tension', ok: false, code: 'provider_unverified' });
  });
});
