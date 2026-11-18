import { Platform, Pressable, StyleSheet } from 'react-native';
import { AppText, Icon, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';

interface LightOnSwipeToggleProps {
  on: boolean;
  /** Receives the value the climber asked for. */
  onChange: (next: boolean) => void;
}

/**
 * Light on swipe (FR-008a): while on, the board follows the problem on screen. Shown only while this phone is
 * connected; the state is worded, not only coloured.
 */
export function LightOnSwipeToggle({ on, onChange }: LightOnSwipeToggleProps) {
  const { colors } = useTheme();
  const ink = on ? colors.onPrimary : colors.onSurfaceCharcoal;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Light on swipe"
      accessibilityHint="Lights each problem you swipe to on the connected board"
      accessibilityState={{ checked: on }}
      {...(Platform.OS === 'web' ? { 'aria-checked': on } : {})}
      onPress={() => onChange(!on)}
      style={({ pressed }) => [
        styles.toggle,
        { backgroundColor: on ? colors.primary : colors.surfaceCharcoalRaised },
        pressed && styles.pressed,
      ]}
    >
      <Icon name="bulb" color={ink} size={16} />
      <AppText variant="caption" numberOfLines={1} style={[styles.label, { color: ink }]}>
        {on ? 'Light on swipe: On' : 'Light on swipe'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: touchTarget,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  label: { flexShrink: 1, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
