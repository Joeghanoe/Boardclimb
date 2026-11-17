import { Pressable, StyleSheet } from 'react-native';
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

/** A choice from a short list (rating filter, manufacturer). Selected state is shown by fill and a check mark. */
export function Chip({ label, selected, onPress, accessibilityLabel, testID }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      {...(testID === undefined ? {} : { testID })}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.controlBorder,
        },
      ]}
    >
      <AppText
        variant="bodyStrong"
        style={{ color: selected ? colors.onPrimary : colors.text }}
        importantForAccessibility="no"
      >
        {selected ? `✓ ${label}` : label}
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
