import { createContext } from 'react';
import type { Theme } from '../tokens/Theme';
import { lightTheme } from '../tokens/themes';

/** The active theme. A host app supplies its own by wrapping the tree in `ThemeContext.Provider`. */
export const ThemeContext = createContext<Theme>(lightTheme);
