import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface StepperProps {
  /** What is shown between the controls: a count, or a label such as a grade. */
  display: string;
  /** Spoken name of the value, for example "Attempts added today". */
  valueLabel: string;
  incrementLabel: string;
  decrementLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  /** Width of the value area; wide labels such as "6A (V3)" need more than a count. */
  valueWidth?: number;
}

/** Plus and minus controls with a visible value: the non-long-press way to edit a number (NFR-007). */
export function Stepper({
  display,
  valueLabel,
  incrementLabel,
  decrementLabel,
  onIncrement,
  onDecrement,
  incrementDisabled = false,
  decrementDisabled = false,
  valueWidth = 56,
}: StepperProps) {
  const { colors } = useTheme();
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
      {control(decrementLabel, '−', onDecrement, decrementDisabled)}
      <View
        accessible
        accessibilityLabel={`${valueLabel}: ${display}`}
        style={[styles.value, { minWidth: valueWidth }]}
      >
        <AppText variant="title" style={styles.valueText}>
          {display}
        </AppText>
      </View>
      {control(incrementLabel, '+', onIncrement, incrementDisabled)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  control: {
    width: touchTarget + 4,
    height: touchTarget + 4,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.4 },
  value: { alignItems: 'center' },
  valueText: { textAlign: 'center' },
});
