import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Card,
  Chip,
  Icon,
  RangeSlider,
  SegmentedControl,
  radii,
  shadows,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import { describeFilters } from './presentation/describeFilters';
import { filtersToRange, rangeToFilters } from './presentation/gradeRange';
import { gradeStops } from './presentation/gradeStops';
import { RATING_FILTER_OPTIONS } from './presentation/ratingFilterOptions';

interface FilterBarProps {
  title: string;
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
  gradeScale: GradeSystem;
  onChangeGradeScale: (scale: GradeSystem) => void;
}

/** Section heading with a filter pill; the grade range and minimum rating open underneath (FR-007). */
export function FilterBar({ title, filters, onChange, gradeScale, onChangeGradeScale }: FilterBarProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const summary = describeFilters(filters, gradeScale);
  const stops = gradeStops(gradeScale);
  const [low, high] = filtersToRange(filters, stops);
  const [preview, setPreview] = useState<[number, number] | null>(null);
  const shown = preview ?? [low, high];
  const last = stops.length - 1;
  const rangeText =
    shown[0] === 0 && shown[1] === last
      ? 'Any grade'
      : `${shown[0] === 0 ? 'Easiest' : stops[shown[0]]?.label} – ${shown[1] === last ? 'Hardest' : stops[shown[1]]?.label}`;
  return (
    <View style={styles.wrap}>
      <View style={styles.heading}>
        <AppText variant="display" accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide filters' : `Filters: ${summary}`}
          accessibilityState={{ expanded: open }}
          accessibilityHint={
            open ? 'Hides the grade and rating filters' : 'Shows the grade and rating filters'
          }
          onPress={() => setOpen((current) => !current)}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: open ? colors.surfaceCharcoal : colors.surface },
            !open && shadows.soft,
            pressed && styles.pressed,
          ]}
        >
          <Icon
            name={open ? 'close' : 'sliders'}
            color={open ? colors.onSurfaceCharcoal : colors.text}
            size={16}
          />
          <AppText
            variant="caption"
            numberOfLines={1}
            style={[styles.pillText, { color: open ? colors.onSurfaceCharcoal : colors.text }]}
          >
            {open ? 'Done' : summary}
          </AppText>
        </Pressable>
      </View>
      {open ? (
        <Card style={styles.panel}>
          <View style={styles.scaleRow}>
            <AppText tone="muted" variant="eyebrow">
              Grades in
            </AppText>
            <View style={styles.scale}>
              <SegmentedControl
                accessibilityLabel="Grade scale"
                options={[
                  { value: 'font', label: 'Font' },
                  { value: 'v', label: 'V' },
                ]}
                value={gradeScale}
                onChange={onChangeGradeScale}
              />
            </View>
          </View>
          <View style={styles.range}>
            <AppText variant="title" accessibilityLiveRegion="polite">
              {rangeText}
            </AppText>
            <RangeSlider
              count={stops.length}
              low={low}
              high={high}
              lowLabel="Easiest grade"
              highLabel="Hardest grade"
              describe={(index) =>
                index === 0 ? 'Any' : index === last ? 'Any' : (stops[index]?.label ?? '')
              }
              onPreview={(l, h) => setPreview([l, h])}
              onChange={(l, h) => {
                setPreview(null);
                onChange(rangeToFilters(filters, [l, h], stops));
              }}
            />
          </View>
          <AppText tone="muted" variant="eyebrow">
            Minimum rating
          </AppText>
          <View style={styles.chips}>
            {RATING_FILTER_OPTIONS.map((option) => (
              <Chip
                key={option.minStars}
                label={option.label}
                selected={filters.minStars === option.minStars}
                onPress={() => onChange({ ...filters, minStars: option.minStars })}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flexShrink: 0 },
  pill: {
    flexShrink: 1,
    minWidth: 0,
    minHeight: touchTarget - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
  },
  pillText: { fontWeight: '700', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  panel: { gap: spacing.md },
  scaleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scale: { width: 150 },
  range: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
