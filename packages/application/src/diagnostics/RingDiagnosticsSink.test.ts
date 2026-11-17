import { describe, expect, it } from 'bun:test';
import { RingDiagnosticsSink } from './RingDiagnosticsSink';

const event = { name: 'board.discovered', manufacturer: 'kilter', count: 1 } as const;

describe('NFR-008 / NFR-009: diagnostics are opt-in and short-lived', () => {
  it('records nothing until the climber turns it on', () => {
    const sink = new RingDiagnosticsSink();
    sink.emit(event);
    expect(sink.isEnabled()).toBe(false);
    expect(sink.snapshot()).toEqual([]);
  });

  it('keeps only the newest events once full', () => {
    const sink = new RingDiagnosticsSink(2, true);
    sink.emit({ ...event, count: 1 });
    sink.emit({ ...event, count: 2 });
    sink.emit({ ...event, count: 3 });
    expect(
      sink.snapshot().map((recorded) => (recorded.name === 'board.discovered' ? recorded.count : -1)),
    ).toEqual([2, 3]);
  });

  it('forgets everything when turned off', () => {
    const sink = new RingDiagnosticsSink(10, true);
    sink.emit(event);
    sink.setEnabled(false);
    expect(sink.snapshot()).toEqual([]);
    expect(sink.isEnabled()).toBe(false);
  });
});
