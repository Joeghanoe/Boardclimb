import type { DiagnosticEvent } from './DiagnosticEvent';

/** Where operations report what happened (CODE.8). The sink decides whether anything is kept. */
export interface DiagnosticsSink {
  emit(event: DiagnosticEvent): void;
}
