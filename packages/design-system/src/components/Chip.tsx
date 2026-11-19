import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** A choice from a short list (rating filter, manufacturer). The selected one is inverted (text colour fill), so it reads on any surface. */
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
          backgroundColor: selected ? colors.text : colors.surfaceMuted,
        },
      ]}
    >
      <AppText
        variant="label"
        style={{ color: selected ? colors.background : colors.text }}
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
