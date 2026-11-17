import { Pressable, StyleSheet, View } from 'react-native';
import { condensedSize, AppText, BLOCKS, Icon, radii, spacing, useTheme } from '@boardclimb/design-system';
import type { GradeSystem, ProblemSummary } from '@boardclimb/domain';
import { displayGrade } from './presentation/displayGrade';
import { formatGrade } from './presentation/formatGrade';
import { formatRating } from './presentation/formatRating';
import { gradeBand } from './presentation/gradeBand';

interface ProblemRowProps {
  problem: ProblemSummary;
  context?: string;
  gradeScale: GradeSystem;
  /** Position in the grouped list: rounds the group's outer corners and drops the last divider. */
  first?: boolean;
  last?: boolean;
  onPress: () => void;
}

/** One problem: a grade block coloured by difficulty band, the name, the rating. */
export function ProblemRow({
  problem,
  onPress,
  context,
  gradeScale,
  first = false,
  last = false,
}: ProblemRowProps) {
  const { colors } = useTheme();
  const grade = displayGrade(problem.grade, gradeScale);
  const block = BLOCKS[gradeBand(problem.grade)];
  const rating = formatRating(problem.rating);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${problem.name}, grade ${formatGrade(problem.grade)}, ${rating.spoken}${context ? ', ' + context : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
        first && styles.first,
        last && styles.last,
      ]}
    >
      <View style={[styles.tile, { backgroundColor: block.bg }]}>
        <AppText
          variant="title"
          style={[styles.tileGrade, { color: block.on }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {grade}
        </AppText>
      </View>
      <View style={styles.body}>
        {context ? (
          <AppText tone="muted" variant="eyebrow" numberOfLines={1}>
            {context}
          </AppText>
        ) : null}
        <AppText variant="label" numberOfLines={1} style={styles.name}>
          {problem.name}
        </AppText>
        <View style={styles.meta}>
          {problem.rating === null ? null : (
            <Icon name="star" color={colors.textMuted} size={11} weight={2.2} />
          )}
          <AppText tone="muted" variant="caption" style={styles.rating}>
            {problem.rating === null ? rating.text : problem.rating.toFixed(1)}
          </AppText>
        </View>
      </View>
      <View style={[styles.go, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name="arrowUpRight" color={colors.text} size={14} weight={2.4} />
      </View>
      {last ? null : <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
    </Pressable>
  );
}

const TILE = 40;

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  first: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingTop: spacing.sm + 4 },
  last: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    paddingBottom: spacing.sm + 4,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tileGrade: condensedSize(18),
  body: { flex: 1, gap: 0 },
  name: { fontSize: 15 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, lineHeight: 16 },
  go: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
