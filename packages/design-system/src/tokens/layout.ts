import { Platform } from 'react-native';

/** Spacing, radii, type scale and touch size. Points, not pixels. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;

/** Minimum touch target (WCAG 2.2 AA floor is 24; phones get 44). */
export const touchTarget = 44;

/** Heavy system face (SF Pro on iPhone, Roboto on Android) for names and numbers; nothing is bundled. */
const heavy = Platform.select({
  ios: { fontWeight: '800' as const },
  android: { fontFamily: 'sans-serif', fontWeight: '700' as const },
  default: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeight: '800' as const,
  },
});

/** Size and a line height that keeps heavy glyphs whole on every platform. */
export function displaySize(fontSize: number): { fontSize: number; lineHeight: number } {
  return { fontSize, lineHeight: Math.ceil(fontSize * 1.2) };
}

/**
 * Two voices: heavy, tight display type for names and numbers you read from a step away, and a quiet body
 * for everything you read up close. Sentence case throughout.
 */
export const typography = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.1 },
  title: { ...displaySize(20), letterSpacing: -0.3, ...heavy },
  display: { ...displaySize(28), letterSpacing: -0.6, ...heavy },
  hero: { ...displaySize(40), letterSpacing: -1, ...heavy },
  numeral: { ...displaySize(30), letterSpacing: -0.5, fontVariant: ['tabular-nums' as const], ...heavy },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;
