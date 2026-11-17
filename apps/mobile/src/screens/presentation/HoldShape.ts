/** One hold of the full board, already placed in canvas units (origin top-left). */
export interface HoldShape {
  holdId: string;
  x: number;
  y: number;
  radius: number;
  /** SVG polygon points of the traced silhouette, or null when only a dot can be drawn. */
  points: string | null;
  /** Farthest outline point from the centre, in radii: where the route ring sits. */
  extent: number;
}
