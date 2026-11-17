/** Route ring colours, the convention climbers know from board apps: green start, cyan hand, yellow foot, magenta finish. */
export const ROLE_COLORS = {
  start: { bg: '#2BD66B', text: '#052E16', border: '#16A34A' },
  hand: { bg: '#2CD3E8', text: '#04252B', border: '#0E9FB3' },
  foot: { bg: '#F5D90A', text: '#2A2000', border: '#C9A800' },
  finish: { bg: '#EC4BF5', text: '#2A0430', border: '#B81FC2' },
} as const;
