import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import type { BoardSessionSnapshot } from '@boardclimb/application';
import { describeConnection } from './presentation/describeConnection';

interface ConnectionChipProps {
  snapshot: BoardSessionSnapshot;
  /** When given, the chip is a button that opens the board screen; without it, it only reports the state. */
  onPress?: () => void;
}

/** The connection state at a glance. State is worded, not only coloured. */
export function ConnectionChip({ snapshot, onPress }: ConnectionChipProps) {
  const { colors } = useTheme();
  const line = describeConnection(snapshot);
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: colors[line.tone] }]} />
      <AppText variant="caption" numberOfLines={2} style={styles.label}>
        {line.label}
      </AppText>
    </>
  );
  const chipStyle = [styles.chip, { borderColor: colors.controlBorder, backgroundColor: colors.surface }];
  if (!onPress) {
    return (
      <View accessibilityLiveRegion="polite" style={chipStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${line.label}. Open boards`}
      onPress={onPress}
      style={chipStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flexShrink: 1 },
});
