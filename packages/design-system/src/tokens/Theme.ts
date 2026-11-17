import type { ColorTokens } from './ColorTokens';

export interface Theme {
  name: 'light' | 'dark';
  colors: ColorTokens;
}
