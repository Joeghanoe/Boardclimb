import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing } from '../tokens/layout';

/** A surface that groups related content. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
});
