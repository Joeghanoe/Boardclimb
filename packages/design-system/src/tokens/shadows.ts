/** Depth instead of outlines: surfaces float on the page with a soft, wide shadow. */
export const shadows = {
  soft: {
    shadowColor: '#1B1C1F',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  lifted: {
    shadowColor: '#1B1C1F',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const;
