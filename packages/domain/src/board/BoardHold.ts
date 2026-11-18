/** Physical hold location and optional traced silhouette. Outline offsets are in units of radius, with y downward. */
export interface BoardHold {
  holdId: string;
  x: number;
  y: number;
  radius: number;
  outline?: readonly number[];
}
