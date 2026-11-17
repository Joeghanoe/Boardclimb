/** A missing rating reads "Not rated", never zero stars (FR-007). */
export function formatRating(rating: number | null): { text: string; spoken: string } {
  if (rating === null) return { text: 'Not rated', spoken: 'Not rated' };
  const shown = rating.toFixed(1);
  return { text: `${shown} ★`, spoken: `Rated ${shown} out of 5` };
}
