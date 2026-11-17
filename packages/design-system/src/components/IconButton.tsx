import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { touchTarget } from '../tokens/layout';
import { shadows } from '../tokens/shadows';
import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './IconName';

interface IconButtonProps {
  icon: IconName;
  /** Spoken name; also shown under the button when `caption` is set. */
  label: string;
  onPress: () => void;
  /** Visible word under the circle, for actions whose icon alone is not enough. */
  caption?: string;
  /** 'surface' floats on paper, 'glass' sits on a colour block, 'raised' on charcoal, 'solid' is filled with `fill`. */
  variant?: 'surface' | 'glass' | 'raised' | 'solid';
  fill?: string;
  onFill?: string;
  size?: number;
  disabled?: boolean;
  /** Shows a spinner instead of the icon and ignores presses. */
  busy?: boolean;
  /** For on/off actions such as Top and Flash. */
  checked?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** A round icon control (BLOC-style header buttons, board-app action bar). At least 44 points. */
export function IconButton({
  icon,
  label,
  onPress,
  caption,
  variant = 'surface',
  fill,
  onFill,
  size = touchTarget,
  disabled = false,
  busy = false,
  checked,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const { colors } = useTheme();
  const palette = {
    surface: { background: colors.surface, icon: colors.text, caption: colors.textMuted },
    glass: { background: 'rgba(255,255,255,0.72)', icon: '#151618', caption: '#151618' },
    raised: {
      background: colors.surfaceCharcoalRaised,
      icon: colors.onSurfaceCharcoal,
      caption: colors.onSurfaceCharcoalMuted,
    },
    solid: {
      background: fill ?? colors.primary,
      icon: onFill ?? colors.onPrimary,
      caption: colors.onSurfaceCharcoalMuted,
    },
  }[variant];
  const isSwitch = checked !== undefined;
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={label}
      {...(isSwitch && Platform.OS === 'web' ? { 'aria-checked': checked } : {})}
      accessibilityState={{ disabled: disabled || busy, busy, ...(isSwitch ? { checked } : {}) }}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      {...(testID === undefined ? {} : { testID })}
      disabled={disabled || busy}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.circle,
          {
            width: Math.max(size, touchTarget),
            height: Math.max(size, touchTarget),
            backgroundColor: palette.background,
          },
          variant === 'surface' && shadows.soft,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={palette.icon} />
        ) : (
          <Icon
            name={icon}
            color={palette.icon}
            size={Math.round(Math.max(size, touchTarget) * 0.42)}
            weight={2.4}
          />
        )}
      </View>
      {caption ? (
        <AppText variant="eyebrow" style={[styles.caption, { color: palette.caption }]} numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: 10, letterSpacing: 1 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.35 },
});
