import type { DiagnosticsSink } from '../ports/DiagnosticsSink';

export const noDiagnostics: DiagnosticsSink = { emit: () => undefined };
