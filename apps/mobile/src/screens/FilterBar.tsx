import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  BottomSheet,
  Chip,
  Icon,
  IconButton,
  RangeSlider,
  SegmentedControl,
  radii,
  shadows,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import { describeFilters } from './presentation/describeFilters';
import { filtersToRange, rangeToFilters } from './presentation/gradeRange';
import { gradeStopPositions } from './presentation/gradeStopPositions';
import { gradeStops } from './presentation/gradeStops';
import { RATING_FILTER_OPTIONS } from './presentation/ratingFilterOptions';

interface FilterBarProps {
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
  gradeScale: GradeSystem;
  onChangeGradeScale: (scale: GradeSystem) => void;
  /** 'glass' is smoked glass over a colour field. */
  surface?: 'paper' | 'glass';
}

/** A filter pill that opens a bottom sheet with the grade range and minimum rating (FR-007); the list never shifts. */
export function FilterBar({
  filters,
  onChange,
  gradeScale,
  onChangeGradeScale,
  surface = 'paper',
}: FilterBarProps) {
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
  const close = () => setOpen(false);
  const filtered = filters.minDifficulty !== null || filters.maxDifficulty !== null || filters.minStars > 0;
  const glass = surface === 'glass';
  const ink = glass ? '#F4F4F1' : colors.text;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filters: ${summary}`}
        accessibilityHint="Opens the grade and rating filters"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.pill,
          glass ? styles.glass : [{ backgroundColor: colors.surface }, shadows.soft],
          pressed && styles.pressed,
        ]}
      >
        <Icon name="sliders" color={ink} size={16} />
        <AppText variant="caption" numberOfLines={1} style={[styles.pillText, { color: ink }]}>
          {summary}
        </AppText>
      </Pressable>
      <BottomSheet
        visible={open}
        onClose={close}
        closeLabel="Close filters"
        style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.divider }]}
      >
        <View style={[styles.handle, { backgroundColor: colors.controlBorder }]} />
        <View style={[styles.sheetHeader, { borderBottomColor: colors.divider }]}>
          <View style={styles.titleCol}>
            <AppText variant="title" accessibilityRole="header">
              Filters
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {summary}
            </AppText>
          </View>
          <View style={styles.headerActions}>
            {filtered ? (
              <IconButton
                icon="reset"
                label="Reset filters"
                variant="raised"
                onPress={() => onChange(defaultProblemFilters)}
              />
            ) : null}
            <IconButton icon="close" label="Done" variant="raised" onPress={close} />
          </View>
        </View>
        <View style={styles.body}>
          <View style={[styles.row, { borderBottomColor: colors.divider }]}>
            <AppText tone="muted">Grades in</AppText>
            <View style={styles.scale}>
              <SegmentedControl
                accessibilityLabel="Grade scale"
                options={[
                  { value: 'font', label: 'Font' },
                  { value: 'v', label: 'V' },
                ]}
                value={gradeScale}
                onChange={onChangeGradeScale}
                size="compact"
              />
            </View>
          </View>
          <View style={[styles.block, { borderBottomColor: colors.divider }]}>
            <View style={styles.rowInline}>
              <AppText tone="muted">Grade</AppText>
              <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
                {rangeText}
              </AppText>
            </View>
            <RangeSlider
              count={stops.length}
              positions={gradeStopPositions(stops)}
              low={low}
              high={high}
              lowLabel="Easiest grade"
              highLabel="Hardest grade"
              describe={(index) => (index === 0 || index === last ? 'Any' : (stops[index]?.label ?? ''))}
              onPreview={(l, h) => setPreview([l, h])}
              onChange={(l, h) => {
                setPreview(null);
                onChange(rangeToFilters(filters, [l, h], stops));
              }}
            />
          </View>
          <View style={styles.block}>
            <AppText tone="muted">Rating</AppText>
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
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
  },
  glass: { backgroundColor: 'rgba(12, 13, 15, 0.55)' },
  pillText: { fontWeight: '700', flexShrink: 1 },
  pressed: { opacity: 0.75 },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: spacing.sm, opacity: 0.6 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleCol: { flex: 1, gap: 2, marginRight: spacing.md },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget + 12,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  block: { gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  scale: { flexShrink: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
