import { Pressable, StyleSheet } from 'react-native';
import { AppText, Icon, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import type { IconName } from '@boardclimb/design-system';

interface StartTileProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** The filled tile is the way most climbers start. */
  primary?: boolean;
}

/** One of the equal start choices on the first screen: an icon over a short label, big enough for a chalky thumb. */
export function StartTile({ label, icon, onPress, primary = false }: StartTileProps) {
  const { colors } = useTheme();
  const fill = primary ? colors.primary : colors.surface;
  const ink = primary ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: fill }, pressed && styles.pressed]}
    >
      <Icon name={icon} color={ink} size={26} weight={2.4} />
      <AppText variant="label" style={[styles.label, { color: ink }]} numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: touchTarget * 2.4,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  label: { textAlign: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
