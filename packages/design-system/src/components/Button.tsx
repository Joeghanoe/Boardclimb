import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { condensedSize, radii, spacing, touchTarget, typography } from '../tokens/layout';
import { shadows } from '../tokens/shadows';
import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './IconName';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** A shortcut only: whatever it does must also be reachable by a visible control (NFR-007). */
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent' | 'charcoal' | 'ghost';
  /** Large buttons are the main action on a screen. */
  large?: boolean;
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
  /** Leading line icon; decorative, the label still names the action. */
  icon?: IconName;
  /** Shows a spinner and ignores presses; the label stays for screen readers. */
  busy?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** A pill-shaped action. Selected and expanded states show an icon as well as a fill. */
export function Button({
  label,
  onPress,
  onLongPress,
  variant = 'secondary',
  large = false,
  disabled = false,
  selected,
  expanded,
  icon,
  busy = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { background: colors.primary, text: colors.onPrimary },
    secondary: { background: colors.surface, text: colors.text },
    danger: { background: colors.danger, text: colors.onDanger },
    accent: { background: colors.accent, text: colors.onAccent },
    charcoal: {
      background: colors.surfaceCharcoalRaised,
      text: colors.onSurfaceCharcoal,
    },
    ghost: { background: 'transparent', text: colors.text },
  }[variant];
  const inactive = disabled || busy;
  const leading: IconName | undefined = selected
    ? 'check'
    : expanded === undefined
      ? icon
      : expanded
        ? 'minus'
        : 'plus';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(selected !== undefined && Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      accessibilityState={{
        disabled: inactive,
        busy,
        ...(selected === undefined || Platform.OS === 'web' ? {} : { selected }),
        ...(expanded === undefined ? {} : { expanded }),
      }}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      {...(testID === undefined ? {} : { testID })}
      disabled={inactive}
      onPress={onPress}
      {...(onLongPress === undefined ? {} : { onLongPress })}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: palette.background },
        variant === 'secondary' && shadows.soft,
        variant === 'primary' && large && shadows.lifted,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={palette.text} />
      ) : leading ? (
        <Icon name={leading} color={palette.text} size={large ? 20 : 18} weight={2.4} />
      ) : null}
      <AppText
        variant="label"
        numberOfLines={1}
        style={[{ color: palette.text, textAlign: 'center' }, large && styles.largeLabel]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  large: { minHeight: 58, paddingHorizontal: spacing.xl },
  largeLabel: { ...typography.title, ...condensedSize(21) },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});
