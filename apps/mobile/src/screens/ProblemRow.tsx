import { Pressable, StyleSheet, View } from 'react-native';
import { displaySize, AppText, BLOCKS, Icon, spacing, useTheme } from '@boardclimb/design-system';
import type { GradeSystem, ProblemSummary } from '@boardclimb/domain';
import { displayGrade } from './presentation/displayGrade';
import { formatAscents } from './presentation/formatAscents';
import { formatGrade } from './presentation/formatGrade';
import { formatRating } from './presentation/formatRating';
import { gradeBand } from './presentation/gradeBand';

interface ProblemRowProps {
  problem: ProblemSummary;
  context?: string;
  gradeScale: GradeSystem;
  /** Drops the divider under the last row. */
  last?: boolean;
  onPress: () => void;
}

/** One dense row: the grade block coloured by difficulty band, then the name and rating. The whole row opens the problem. */
export function ProblemRow({ problem, onPress, context, gradeScale, last = false }: ProblemRowProps) {
  const { colors } = useTheme();
  const grade = displayGrade(problem.grade, gradeScale);
  const block = BLOCKS[gradeBand(problem.grade)];
  const rating = formatRating(problem.rating);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        problem.name,
        `grade ${formatGrade(problem.grade)}`,
        rating.spoken,
        formatAscents(problem.ascents),
        problem.setter ? `set by ${problem.setter}` : null,
        context ?? null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={[styles.grade, { backgroundColor: block.bg }]}>
        <AppText
          variant="title"
          style={[styles.gradeText, { color: block.on }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {grade}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={1} style={styles.name}>
          {problem.name}
        </AppText>
        <View style={styles.meta}>
          {problem.rating === null ? null : (
            <Icon name="star" color={colors.textMuted} size={11} weight={2.2} />
          )}
          <AppText tone="muted" variant="caption" style={styles.small} numberOfLines={1}>
            {[
              problem.rating === null ? rating.text : problem.rating.toFixed(1),
              formatAscents(problem.ascents),
              context ?? problem.setter ?? null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </AppText>
        </View>
      </View>
      {last ? null : <View style={[styles.divider, { backgroundColor: colors.divider }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  body: { flex: 1, gap: 1 },
  name: { fontSize: 17, lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  small: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  grade: {
    width: 46,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { ...displaySize(18), letterSpacing: -0.5 },
  divider: {
    position: 'absolute',
    left: spacing.lg + 46 + spacing.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
