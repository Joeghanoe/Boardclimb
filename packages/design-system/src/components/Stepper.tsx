import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface StepperProps {
  value: number;
  /** Lowest allowed value; the minus control is disabled there. */
  min?: number;
  incrementLabel: string;
  decrementLabel: string;
  /** Spoken name of the value, for example "Attempts today". */
  valueLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

/** Plus and minus controls with a visible count: the non-long-press way to edit a number (NFR-007). */
export function Stepper({
  value,
  min = 0,
  incrementLabel,
  decrementLabel,
  valueLabel,
  onIncrement,
  onDecrement,
  disabled = false,
}: StepperProps) {
  const { colors } = useTheme();
  const atMin = value <= min;
  const control = (label: string, symbol: string, onPress: () => void, off: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      style={[
        styles.control,
        { backgroundColor: colors.surface, borderColor: colors.controlBorder },
        off && styles.off,
      ]}
    >
      <AppText variant="title" importantForAccessibility="no">
        {symbol}
      </AppText>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {control(decrementLabel, '−', onDecrement, disabled || atMin)}
      <View accessible accessibilityLabel={`${valueLabel}: ${value}`} style={styles.value}>
        <AppText variant="display">{String(value)}</AppText>
      </View>
      {control(incrementLabel, '+', onIncrement, disabled)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  control: {
    width: touchTarget + 8,
    height: touchTarget + 8,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.4 },
  value: { minWidth: 56, alignItems: 'center' },
});
