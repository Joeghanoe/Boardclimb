/** Spacing, radii, type scale and touch size. Points, not pixels. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radii = { sm: 6, md: 12, lg: 20, pill: 999 } as const;

/** Minimum touch target (WCAG 2.2 AA floor is 24; phones get 44). */
export const touchTarget = 44;

export const typography = {
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
} as const;
