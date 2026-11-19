import { Platform, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppText, BLOCKS, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import type { BlockName } from '@boardclimb/design-system';
import type { Manufacturer } from '@boardclimb/domain';
import { ManufacturerMark } from './ManufacturerMark';

interface PickerPillProps {
  label: string;
  selected: boolean;
  /** The chosen pill is filled with this colour: the same one that glows behind the screen. */
  block: BlockName;
  onPress: () => void;
  /** Shows that manufacturer's mark before the label. */
  manufacturer?: Manufacturer;
  /** Shows only the mark; the label is still spoken. For rows where every name would not fit. */
  markOnly?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** One choice in a row of choices. The selected one carries the manufacturer's colour and a filled shape. */
export function PickerPill({
  label,
  selected,
  block,
  onPress,
  manufacturer,
  markOnly = false,
  accessibilityLabel,
  style,
}: PickerPillProps) {
  const { colors } = useTheme();
  const fill = BLOCKS[block];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={Platform.OS === 'web' ? {} : { selected }}
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: selected ? fill.bg : colors.surface },
        pressed && styles.pressed,
        style,
      ]}
    >
      {manufacturer ? <ManufacturerMark manufacturer={manufacturer} size={22} /> : null}
      {markOnly && manufacturer ? null : (
        <AppText
          variant="label"
          style={[styles.label, { color: selected ? fill.on : colors.text }]}
          importantForAccessibility="no"
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    minWidth: touchTarget,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.8 },
});
