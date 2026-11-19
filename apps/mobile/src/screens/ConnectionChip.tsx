import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  darkTheme,
  radii,
  shadows,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { BoardSessionSnapshot } from '@boardclimb/application';
import { describeConnection } from './presentation/describeConnection';

interface ConnectionChipProps {
  snapshot: BoardSessionSnapshot;
  /** When given, the chip is a button that opens the board screen; without it, it only reports the state. */
  onPress?: () => void;
  /** 'charcoal' sits on the dark board screen, 'glass' is smoked glass over a colour field. */
  surface?: 'paper' | 'charcoal' | 'glass';
  /** Shows the short label; screen readers still hear the full state. */
  compact?: boolean;
}

/** The connection state at a glance. State is worded, not only coloured. */
export function ConnectionChip({
  snapshot,
  onPress,
  surface = 'paper',
  compact = false,
}: ConnectionChipProps) {
  const { colors } = useTheme();
  const line = describeConnection(snapshot);
  const dark = surface === 'charcoal';
  const dot = (dark || surface === 'glass' ? darkTheme.colors : colors)[line.tone];
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <AppText
        variant="caption"
        numberOfLines={1}
        style={[
          styles.label,
          { color: dark ? colors.onSurfaceCharcoal : surface === 'glass' ? GLASS_INK : colors.text },
        ]}
      >
        {compact ? line.short : line.label}
      </AppText>
    </>
  );
  const chipBase = [
    styles.chip,
    dark
      ? { backgroundColor: colors.surfaceCharcoalRaised }
      : surface === 'glass'
        ? { backgroundColor: GLASS }
        : [{ backgroundColor: colors.surface }, shadows.soft],
  ];
  if (!onPress) {
    return (
      <View accessibilityLiveRegion="polite" accessible accessibilityLabel={line.label} style={chipBase}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line.label}. Open boards`}
      onPress={onPress}
      style={({ pressed }) => [chipBase, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

/** Smoked glass: the colour field shows through, text stays light and readable. */
const GLASS = 'rgba(12, 13, 15, 0.55)';
const GLASS_INK = '#F4F4F1';

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flexShrink: 1, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
