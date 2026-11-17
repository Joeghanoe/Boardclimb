import { useContext } from 'react';
import type { Theme } from '../tokens/Theme';
import { ThemeContext } from './ThemeContext';

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
