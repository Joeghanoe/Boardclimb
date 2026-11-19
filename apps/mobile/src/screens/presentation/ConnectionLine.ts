/** `tone` maps to the connection colours in the design system. */
export interface ConnectionLine {
  tone: 'connected' | 'connecting' | 'disconnected';
  label: string;
  /** Fits a compact chip: the board's name once connected, otherwise what to do. */
  short: string;
}
