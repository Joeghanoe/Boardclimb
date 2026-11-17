import { describe, expect, it } from 'bun:test';
import { MANUFACTURERS } from '@boardclimb/domain';
import { exists, packageFolders, readText, sources } from './sourceFiles';

const registry = await readText('apps/mobile/src/composition/createRegistry.ts');

function packagesStartingWith(prefix: string): string[] {
  return packageFolders().filter((name) => name.startsWith(prefix));
}

describe('every manufacturer has both adapters, registered and under contract (FR-001, AC-015)', () => {
  it.each(MANUFACTURERS)('%s has a catalog package and a board package', async (manufacturer) => {
    expect(await exists(`packages/catalog-${manufacturer}/package.json`)).toBe(true);
    expect(await exists(`packages/board-${manufacturer}/package.json`)).toBe(true);
  });

  it('has no adapter package for a manufacturer the domain does not know', () => {
    const known = new Set<string>(MANUFACTURERS);
    for (const name of [...packagesStartingWith('catalog-'), ...packagesStartingWith('board-')]) {
      if (name === 'catalog-core') continue;
      expect(known.has(name.replace(/^(catalog|board)-/, '')), name).toBe(true);
    }
  });

  it('registers every adapter package in the composition root', () => {
    for (const manufacturer of MANUFACTURERS) {
      expect(registry, `catalog-${manufacturer}`).toContain(`@boardclimb/catalog-${manufacturer}`);
      expect(registry, `board-${manufacturer}`).toContain(`@boardclimb/board-${manufacturer}`);
    }
  });

  it('runs the shared catalog contract in every catalog package and the controller contract in every board package', () => {
    for (const manufacturer of MANUFACTURERS) {
      const catalogTests = sources.filter(
        (file) => file.path.startsWith(`packages/catalog-${manufacturer}/`) && file.path.endsWith('.test.ts'),
      );
      const boardTests = sources.filter(
        (file) => file.path.startsWith(`packages/board-${manufacturer}/`) && file.path.endsWith('.test.ts'),
      );
      expect(
        catalogTests.some((file) => file.text.includes('runCatalogContract(')),
        `catalog-${manufacturer}`,
      ).toBe(true);
      expect(
        boardTests.some((file) => file.text.includes('runBoardControllerContract(')),
        `board-${manufacturer}`,
      ).toBe(true);
    }
  });

  it('keeps the explicit spike note beside every adapter until it is verified against the vendor (ADR-0002 section 7)', async () => {
    for (const manufacturer of MANUFACTURERS) {
      for (const kind of ['catalog', 'board']) {
        expect(await exists(`packages/${kind}-${manufacturer}/SPIKE.md`), `${kind}-${manufacturer}`).toBe(
          true,
        );
      }
    }
  });
});
