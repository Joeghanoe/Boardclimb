import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Large buttons are the main action on a screen. */
  large?: boolean;
  disabled?: boolean;
  /** Shows a spinner and ignores presses; the label stays for screen readers. */
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  large = false,
  disabled = false,
  busy = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { background: colors.primary, text: colors.onPrimary, border: colors.primary },
    secondary: { background: colors.surface, text: colors.text, border: colors.controlBorder },
    danger: { background: colors.danger, text: colors.onDanger, border: colors.danger },
  }[variant];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      {...(testID === undefined ? {} : { testID })}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {busy ? <ActivityIndicator color={palette.text} style={styles.spinner} /> : null}
      <AppText variant="bodyStrong" style={{ color: palette.text, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  large: { minHeight: 56 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  spinner: { marginRight: spacing.sm },
});
