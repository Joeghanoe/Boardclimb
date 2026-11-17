import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface ToggleButtonProps {
  label: string;
  value: boolean;
  /** Receives the value the climber asked for; the caller sets it, it does not flip it. */
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** An on/off achievement. State is shown by words and fill, not by colour alone. */
export function ToggleButton({ label, value, onValueChange, disabled = false, testID }: ToggleButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      {...(Platform.OS === 'web' ? { 'aria-checked': value } : {})}
      accessibilityState={{ checked: value, disabled }}
      {...(testID === undefined ? {} : { testID })}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.toggle,
        {
          backgroundColor: value ? colors.success : colors.surfaceMuted,
        },
        disabled && styles.disabled,
      ]}
    >
      <AppText variant="label" style={{ color: value ? colors.onSuccess : colors.text }}>
        {label}
      </AppText>
      <AppText style={{ color: value ? colors.onSuccess : colors.textMuted }}>{value ? 'On' : 'Off'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flex: 1,
    minHeight: touchTarget + 12,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
