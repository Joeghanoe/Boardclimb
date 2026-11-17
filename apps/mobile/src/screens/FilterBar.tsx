import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Chip, Stepper, spacing } from '@boardclimb/design-system';
import type { ProblemFilters } from '@boardclimb/domain';
import { describeFilters } from './presentation/describeFilters';
import { describeGradeBound } from './presentation/describeGradeBound';
import { RATING_FILTER_OPTIONS } from './presentation/ratingFilterOptions';
import { stepGradeBound } from './presentation/stepGradeBound';

interface FilterBarProps {
  filters: ProblemFilters;
  onChange: (next: ProblemFilters) => void;
}

/** The grade range and minimum rating, shared by every manufacturer (FR-007). Collapsed to one line so problems come first. */
export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const summary = describeFilters(filters);
  return (
    <Card>
      <Button
        label={open ? 'Hide filters' : `Filters: ${summary}`}
        accessibilityHint={open ? 'Hides the grade and rating filters' : 'Shows the grade and rating filters'}
        onPress={() => setOpen((current) => !current)}
      />
      {open ? (
        <>
          <View style={styles.limits}>
            <View style={styles.limit}>
              <AppText tone="muted" variant="caption">
                Easiest grade
              </AppText>
              <Stepper
                display={describeGradeBound(filters.minDifficulty)}
                valueLabel="Easiest grade"
                decrementLabel="Easiest grade: one step easier"
                incrementLabel="Easiest grade: one step harder"
                valueWidth={92}
                onDecrement={() => onChange(stepGradeBound(filters, 'min', -1))}
                onIncrement={() => onChange(stepGradeBound(filters, 'min', 1))}
              />
            </View>
            <View style={styles.limit}>
              <AppText tone="muted" variant="caption">
                Hardest grade
              </AppText>
              <Stepper
                display={describeGradeBound(filters.maxDifficulty)}
                valueLabel="Hardest grade"
                decrementLabel="Hardest grade: one step easier"
                incrementLabel="Hardest grade: one step harder"
                valueWidth={92}
                onDecrement={() => onChange(stepGradeBound(filters, 'max', -1))}
                onIncrement={() => onChange(stepGradeBound(filters, 'max', 1))}
              />
            </View>
          </View>
          <AppText tone="muted" variant="caption">
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
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  limits: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  limit: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
