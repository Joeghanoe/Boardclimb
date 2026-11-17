import { Platform } from 'react-native';

/** Spacing, radii, type scale and touch size. Points, not pixels. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 12, md: 18, lg: 26, xl: 34, pill: 999 } as const;

/** Minimum touch target (WCAG 2.2 AA floor is 24; phones get 44). */
export const touchTarget = 44;

/**
 * Condensed heavy face for names and numbers, from fonts already on the phone: Avenir Next Condensed on
 * iOS, Roboto Condensed on Android. Nothing is bundled.
 */
const condensed = Platform.select({
  ios: { fontFamily: 'AvenirNextCondensed-Heavy' },
  android: { fontFamily: 'sans-serif-condensed', fontWeight: '700' as const },
  default: {
    fontFamily: '"Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif',
    fontWeight: '800' as const,
  },
});

/**
 * Size for the condensed face. Its glyphs stand taller than their font size, so iOS clips them when the
 * line height is close to the size; 1.25 keeps the caps whole on every platform.
 */
export function condensedSize(fontSize: number): { fontSize: number; lineHeight: number } {
  return { fontSize, lineHeight: Math.ceil(fontSize * 1.25) };
}

/**
 * Two voices: heavy, tight, upper-case display type for names and numbers you read from a step away,
 * and a quiet sentence-case body for everything you read up close.
 */
export const typography = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.1 },
  title: {
    ...condensedSize(22),
    letterSpacing: 0,
    textTransform: 'uppercase' as const,
    ...condensed,
  },
  display: {
    ...condensedSize(36),
    letterSpacing: -0.4,
    textTransform: 'uppercase' as const,
    ...condensed,
  },
  hero: {
    ...condensedSize(48),
    letterSpacing: -0.8,
    textTransform: 'uppercase' as const,
    ...condensed,
  },
  numeral: {
    ...condensedSize(34),
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums' as const],
    ...condensed,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;
