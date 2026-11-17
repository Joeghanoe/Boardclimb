import type { DiagnosticEvent } from '../ports/DiagnosticEvent';
import type { DiagnosticsSink } from '../ports/DiagnosticsSink';

/** Keeps the last events in memory for the opt-in diagnostic view. Cleared when the app exits (design: retention). */
export class RingDiagnosticsSink implements DiagnosticsSink {
  private readonly events: DiagnosticEvent[] = [];

  constructor(
    private readonly capacity = 500,
    private enabled = false,
  ) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.events.length = 0;
  }

  emit(event: DiagnosticEvent): void {
    if (!this.enabled) return;
    this.events.push(event);
    if (this.events.length > this.capacity) this.events.shift();
  }

  snapshot(): readonly DiagnosticEvent[] {
    return [...this.events];
  }
}
