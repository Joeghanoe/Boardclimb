import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, touchTarget } from '../tokens/layout';
import { AppText } from './AppText';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 'compact' fits inside a list row; each segment still reaches 44 points with its touch margin. */
  size?: 'regular' | 'compact';
}

/** Two to four mutually exclusive views in one pill track. The chosen one is inverted (ink on paper becomes paper on ink). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = 'regular',
}: SegmentedControlProps<T>) {
  const compact = size === 'compact';
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, compact && styles.trackCompact, { backgroundColor: colors.surfaceMuted }]}
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
            {...(compact ? { hitSlop: { top: 8, bottom: 8 } } : {})}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              selected && { backgroundColor: colors.text },
            ]}
          >
            <AppText
              variant={compact ? 'caption' : 'label'}
              style={[
                { color: selected ? colors.background : colors.textMuted },
                compact && styles.labelCompact,
              ]}
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
  trackCompact: { padding: 3, gap: 2 },
  segmentCompact: { flex: 0, minHeight: 30, minWidth: 48, paddingHorizontal: 14 },
  labelCompact: { fontWeight: '700' },
  segment: {
    flex: 1,
    minHeight: touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
