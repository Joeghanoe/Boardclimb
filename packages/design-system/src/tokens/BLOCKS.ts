/**
 * Colour blocks: large flat fields that carry meaning (a manufacturer, a grade band). Text on a block
 * always uses its `on` colour, which reaches 4.5:1 (contrast.test.ts).
 */
export const BLOCKS = {
  yellow: { bg: '#F2E431', on: '#151618' },
  coral: { bg: '#F27A5E', on: '#1A0B07' },
  violet: { bg: '#8F84F7', on: '#0D0A2A' },
  mint: { bg: '#8FE3B0', on: '#0B2416' },
  sky: { bg: '#86CDF4', on: '#06202E' },
  rose: { bg: '#F07AB0', on: '#2A0618' },
  stone: { bg: '#D9D6CE', on: '#151618' },
} as const;

export type BlockName = keyof typeof BLOCKS;
