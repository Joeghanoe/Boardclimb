/** Minimum star choices offered in the filter: 0 means no rating filter. */
export const RATING_FILTER_OPTIONS: readonly { minStars: number; label: string }[] = [
  { minStars: 0, label: 'Any' },
  { minStars: 3, label: '3+ ★' },
  { minStars: 4, label: '4+ ★' },
];
