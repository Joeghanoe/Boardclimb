/** `busy` means the controller refused because another phone holds the connection (ADR-0002 A4). */
export type TransportConnectResult = { ok: true } | { ok: false; reason: 'timeout' | 'busy' | 'failed' };
