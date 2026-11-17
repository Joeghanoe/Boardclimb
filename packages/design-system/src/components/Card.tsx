import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing } from '../tokens/layout';
import { shadows } from '../tokens/shadows';

export interface CardProps extends ViewProps {
  /** 'default' floats on the page, 'charcoal' is a dark feature panel, 'muted' is a quiet well. */
  variant?: 'default' | 'charcoal' | 'muted';
}

/** A surface that groups related content. No outline: it is set apart by tone and a soft shadow. */
export function Card({ style, variant = 'default', ...rest }: CardProps) {
  const { colors } = useTheme();
  const palette = {
    default: [{ backgroundColor: colors.surface }, shadows.soft],
    charcoal: [{ backgroundColor: colors.surfaceCharcoal }],
    muted: [{ backgroundColor: colors.surfaceMuted }],
  }[variant];
  return <View {...rest} style={[styles.card, ...palette, style]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.lg + 2, gap: spacing.sm },
});
