import type { BoardSessionSnapshot } from '@boardclimb/application';
import type { ConnectionLine } from './ConnectionLine';

export function describeConnection(snapshot: BoardSessionSnapshot): ConnectionLine {
  const name = snapshot.board?.name ?? 'board';
  switch (snapshot.connection) {
    case 'connected':
      return { tone: 'connected', label: `Connected to ${name}`, short: name };
    case 'connecting':
      return { tone: 'connecting', label: 'Connecting…', short: 'Connecting…' };
    case 'lost':
      return { tone: 'disconnected', label: `Lost connection to ${name}`, short: 'Reconnect' };
    case 'failed':
      return { tone: 'disconnected', label: 'Could not connect', short: 'Connect' };
    case 'idle':
      return { tone: 'disconnected', label: 'No board connected', short: 'Connect' };
  }
}
