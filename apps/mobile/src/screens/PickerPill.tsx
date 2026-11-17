import { Platform, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppText, BLOCKS, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import type { BlockName } from '@boardclimb/design-system';

interface PickerPillProps {
  label: string;
  selected: boolean;
  /** The chosen pill is filled with this colour: the same one that glows behind the screen. */
  block: BlockName;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** One choice in a row of choices. The selected one carries the manufacturer's colour and a filled shape. */
export function PickerPill({ label, selected, block, onPress, accessibilityLabel, style }: PickerPillProps) {
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
      <AppText
        variant="label"
        numberOfLines={1}
        style={{ color: selected ? fill.on : colors.text }}
        importantForAccessibility="no"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
