import type { DiagnosticEvent } from '../ports/DiagnosticEvent';
import type { DiagnosticsSink } from '../ports/DiagnosticsSink';

export class RecordingDiagnostics implements DiagnosticsSink {
  readonly events: DiagnosticEvent[] = [];

  emit(event: DiagnosticEvent): void {
    this.events.push(event);
  }
}
