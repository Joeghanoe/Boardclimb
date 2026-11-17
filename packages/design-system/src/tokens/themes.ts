import type { Theme } from './Theme';

/**
 * Original palette: deep slate surfaces with a warm orange action colour. It is not taken from any
 * manufacturer or from TopLogger; the reference audit (ADR-0002 section 2.6, item 6) is still open.
 */
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: '#F4F5F7',
    surface: '#FFFFFF',
    surfaceMuted: '#E9ECF0',
    text: '#14181F',
    textMuted: '#454E5C',
    divider: '#D5DAE1',
    controlBorder: '#7A8494',
    primary: '#B93C06',
    onPrimary: '#FFFFFF',
    link: '#1D4ED8',
    success: '#166534',
    onSuccess: '#FFFFFF',
    danger: '#B91C1C',
    onDanger: '#FFFFFF',
    noticeBackground: '#FEF3C7',
    noticeText: '#6B3A06',
    connected: '#166534',
    connecting: '#92400E',
    disconnected: '#4B5563',
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '#0E1217',
    surface: '#18202A',
    surfaceMuted: '#232C38',
    text: '#F1F3F6',
    textMuted: '#B3BCC8',
    divider: '#2E3846',
    controlBorder: '#778397',
    primary: '#FB923C',
    onPrimary: '#190C02',
    link: '#93B4FF',
    success: '#4ADE80',
    onSuccess: '#06240F',
    danger: '#F87171',
    onDanger: '#2A0505',
    noticeBackground: '#3B2A08',
    noticeText: '#FDE7B0',
    connected: '#4ADE80',
    connecting: '#FBBF24',
    disconnected: '#A3ADBB',
  },
};
