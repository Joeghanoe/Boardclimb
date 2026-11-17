/** `tone` maps to the connection colours in the design system. */
export interface ConnectionLine {
  tone: 'connected' | 'connecting' | 'disconnected';
  label: string;
}
