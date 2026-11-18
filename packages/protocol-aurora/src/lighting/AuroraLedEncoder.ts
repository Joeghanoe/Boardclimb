import type { BoardConfiguration, Problem } from '@boardclimb/domain';
import type { LedEncoder } from '@boardclimb/bluetooth-core';

/** Adapted from Boardsesh aurora.ts at c788005; Apache-2.0. See third-party NOTICE.
 * Every hold must map; partial patterns and empty/dark payloads are refused.
 */
export class AuroraLedEncoder implements LedEncoder {
  encode(
    problem: Problem,
    _configuration: BoardConfiguration,
    deviceName?: string | null,
  ): Uint8Array[] | null {
    const version = Number(deviceName?.match(/@(\d+)$/)?.[1] ?? 2);
    if (version !== 2 && version !== 3) return null;
    if (
      !problem.holds.length ||
      problem.holds.some(
        (h) =>
          h.ledPosition === undefined ||
          !Number.isInteger(h.ledPosition) ||
          h.ledPosition < 0 ||
          h.ledPosition > (version === 2 ? 1023 : 65535) ||
          !h.ledColor ||
          !/^[0-9a-f]{6}$/i.test(h.ledColor),
      )
    )
      return null;
    const entries = problem.holds.map((h) => ({
      position: h.ledPosition!,
      rgb: [0, 2, 4].map((i) => parseInt(h.ledColor!.slice(i, i + 2), 16)),
    }));
    const scale =
      version === 3
        ? 1
        : [1, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05].find((s) => {
            const power = entries.reduce(
              (sum, e) => sum + e.rgb.reduce((n, v) => n + (Math.floor(v * s) >> 6), 0) / 30,
              0,
            );
            return power * (problem.manufacturer === 'kilter' ? 2 : 1) <= 18;
          });
    if (scale === undefined) return null;
    const bodies: number[][] = [[]];
    let lit = 0;
    for (const entry of entries) {
      const [r = 0, g = 0, b = 0] = entry.rgb;
      const color =
        version === 3
          ? ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6)
          : ((Math.floor(r * scale) >> 6) << 6) |
            ((Math.floor(g * scale) >> 6) << 4) |
            ((Math.floor(b * scale) >> 6) << 2);
      if (color) lit++;
      const encoded =
        version === 3
          ? [entry.position & 255, entry.position >> 8, color]
          : [entry.position & 255, color | (entry.position >> 8)];
      if (bodies.at(-1)!.length + encoded.length > 254) bodies.push([]);
      bodies.at(-1)!.push(...encoded);
    }
    if (!lit) return null;
    const base = version === 3 ? 81 : 77;
    return bodies.map((data, i) => {
      const command =
        bodies.length === 1 ? base + 3 : i === 0 ? base + 1 : i === bodies.length - 1 ? base + 2 : base;
      const body = [command, ...data];
      const checksum = body.reduce((sum, v) => (sum + v) & 255, 0) ^ 255;
      return Uint8Array.from([1, body.length, checksum, 2, ...body, 3]);
    });
  }
}
