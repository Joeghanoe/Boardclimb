import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { shadows } from '../tokens/shadows';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** A choice from a short list (rating filter, manufacturer). Selected state is shown by an inverted fill and the selected state. */
export function Chip({ label, selected, onPress, accessibilityLabel, testID }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={Platform.OS === 'web' ? {} : { selected }}
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      {...(testID === undefined ? {} : { testID })}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.surfaceCharcoal : colors.surface,
        },
        !selected && shadows.soft,
      ]}
    >
      <AppText
        variant="label"
        style={{ color: selected ? colors.onSurfaceCharcoal : colors.text }}
        importantForAccessibility="no"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
