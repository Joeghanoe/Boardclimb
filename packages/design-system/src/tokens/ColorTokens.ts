/**
 * Semantic colours. Components use these names, never raw values, so a host app (for example a future
 * TopLogger shell) can supply its own theme without touching a screen (ADR-0002 section 2.6).
 */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  /** Hairlines and card edges; decorative, not required to reach 3:1. */
  divider: string;
  /** Edges of controls that must be perceivable (3:1 against the surface). */
  controlBorder: string;
  primary: string;
  onPrimary: string;
  link: string;
  success: string;
  onSuccess: string;
  danger: string;
  onDanger: string;
  noticeBackground: string;
  noticeText: string;
  /** Connection states. */
  connected: string;
  connecting: string;
  disconnected: string;
}
