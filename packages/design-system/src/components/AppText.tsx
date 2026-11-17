import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { typography } from '../tokens/layout';

type TextTone =
  'default' | 'muted' | 'danger' | 'link' | 'success' | 'accent' | 'primary' | 'inverse' | 'inverseMuted';

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  tone?: TextTone;
}

/** The only text component screens use: type scale and colours come from the theme. */
export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    danger: colors.danger,
    link: colors.link,
    success: colors.success,
    accent: colors.accent,
    primary: colors.primary,
    inverse: colors.onSurfaceCharcoal,
    inverseMuted: colors.onSurfaceCharcoalMuted,
  }[tone];
  return <Text {...rest} style={[typography[variant], { color }, style]} />;
}
