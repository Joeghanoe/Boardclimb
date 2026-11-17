import type { DiagnosticEvent } from '@boardclimb/application';

/** One line per recorded event. The sink only holds allow-listed fields, so every value is safe to print. */
export function formatDiagnosticEvent(event: DiagnosticEvent): string {
  const { name, ...fields } = event;
  const details = Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${key} ${String(value)}`);
  return [name, ...details].join(' · ');
}
