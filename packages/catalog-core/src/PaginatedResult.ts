export interface PaginatedResult<T> {
  items: T[];
  /** Null means the provider has nothing more; a cut-off page always has a cursor. */
  nextCursor: string | null;
  /** Records the provider sent that failed validation and were dropped. Reported, never silent. */
  skipped: number;
}
