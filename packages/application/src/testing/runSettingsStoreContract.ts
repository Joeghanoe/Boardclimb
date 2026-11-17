import { describe, expect, it } from 'bun:test';
import type { SettingsStore } from '../ports/SettingsStore';

/** The shared SettingsStore contract (FR-007). The in-memory store and the SQLite store both run it. */
export function runSettingsStoreContract(
  name: string,
  create: () => SettingsStore | Promise<SettingsStore>,
): void {
  describe(`${name} satisfies the SettingsStore contract`, () => {
    it('returns null until something is saved', async () => {
      const store = await create();
      expect(await store.loadFilters()).toBeNull();
      expect(await store.loadBoardSelection()).toBeNull();
    });

    it('round-trips filters, including open ends, and keeps the latest', async () => {
      const store = await create();
      await store.saveFilters({ minDifficulty: 5, maxDifficulty: null, minStars: 3 });
      expect(await store.loadFilters()).toEqual({ minDifficulty: 5, maxDifficulty: null, minStars: 3 });
      await store.saveFilters({ minDifficulty: null, maxDifficulty: 12, minStars: 0 });
      expect(await store.loadFilters()).toEqual({ minDifficulty: null, maxDifficulty: 12, minStars: 0 });
    });

    it('round-trips the chosen board layout', async () => {
      const store = await create();
      const selection = {
        boardName: 'Sample MoonBoard',
        configuration: {
          id: 'c',
          boardId: 'b',
          manufacturer: 'moonboard',
          name: 'Set A',
          angleDegrees: null,
        },
      } as const;
      await store.saveBoardSelection(selection);
      expect(await store.loadBoardSelection()).toEqual(selection);
    });
  });
}
