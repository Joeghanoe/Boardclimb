/**
 * The minimum a provider source must deliver per listed problem. A source turns the vendor's wire format
 * into this record; the adapter validates it and maps it to the domain. Values are untrusted.
 */
export interface ProviderProblemSummaryRecord {
  id: string;
  name: string;
  gradeSystem: string;
  gradeLabel: string;
  rating: number | null;
}
