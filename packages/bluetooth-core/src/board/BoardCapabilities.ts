/** What a controller is known to support. 'unknown' until a physical test says otherwise (ADR-0002 A4, A5). */
export interface BoardCapabilities {
  simultaneousConnections: 'supported' | 'unsupported' | 'unknown';
  ledStateReadback: 'supported' | 'unsupported' | 'unknown';
  canIdentifyConfiguration: boolean;
}
