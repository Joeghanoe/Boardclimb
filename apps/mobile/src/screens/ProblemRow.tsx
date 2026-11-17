import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, radii, spacing, useTheme } from '@boardclimb/design-system';
import type { ProblemSummary } from '@boardclimb/domain';
import { formatGrade } from './presentation/formatGrade';
import { formatRating } from './presentation/formatRating';

interface ProblemRowProps {
  problem: ProblemSummary;
  context?: string;
  onPress: () => void;
}

export function ProblemRow({ problem, onPress, context }: ProblemRowProps) {
  const { colors } = useTheme();
  const grade = formatGrade(problem.grade);
  const rating = formatRating(problem.rating);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${problem.name}, grade ${grade}, ${rating.spoken}${context ? ', ' + context : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.divider },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.name}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {problem.name}
        </AppText>
        {context ? (
          <AppText tone="muted" variant="caption">
            {context}
          </AppText>
        ) : null}
        <AppText tone="muted">{rating.text}</AppText>
      </View>
      <AppText variant="title">{grade}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  pressed: { opacity: 0.8 },
  name: { flex: 1 },
});
