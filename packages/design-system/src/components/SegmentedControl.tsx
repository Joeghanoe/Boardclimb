import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, touchTarget } from '../tokens/layout';
import { shadows } from '../tokens/shadows';
import { AppText } from './AppText';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Two to four mutually exclusive views in one pill track. The chosen one is inverted (ink on paper becomes paper on ink). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: colors.surface }, shadows.soft]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            {...(Platform.OS === 'web' ? { 'aria-selected': selected } : {})}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: colors.text }]}
          >
            <AppText
              variant="label"
              style={{ color: selected ? colors.background : colors.textMuted }}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radii.pill, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
