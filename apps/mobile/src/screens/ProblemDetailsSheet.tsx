import { ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import {
  AppText,
  BottomSheet,
  IconButton,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { LogSummary, Problem, ProblemSummary } from '@boardclimb/domain';
import { HistoryCard } from './HistoryCard';
import { HoldsCard } from './HoldsCard';
import { describeConfiguration } from './presentation/describeConfiguration';
import { formatGrade } from './presentation/formatGrade';
import { formatRating } from './presentation/formatRating';

export interface ProblemDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  selection: BoardSelection;
  summary: ProblemSummary;
  problem: Problem | null;
  logSummary: LogSummary | null;
  today: string;
}

/** Secondary facts behind the info button: holds per role, the board, attempts and history. */
export function ProblemDetailsSheet({
  visible,
  onClose,
  selection,
  summary,
  problem,
  logSummary,
  today,
}: ProblemDetailsSheetProps) {
  const { colors } = useTheme();
  const rating = formatRating(summary.rating);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeLabel="Dismiss problem details"
      style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.divider }]}
    >
      <View style={[styles.handle, { backgroundColor: colors.controlBorder }]} />
      <View style={[styles.sheetHeader, { borderBottomColor: colors.divider }]}>
        <View style={styles.sheetTitleCol}>
          <AppText variant="title" numberOfLines={1} accessibilityRole="header">
            {summary.name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {[formatGrade(summary.grade), rating.text, problem?.setter ? `Set by ${problem.setter}` : null]
              .filter(Boolean)
              .join('  ·  ')}
          </AppText>
        </View>
        <IconButton icon="close" label="Done" variant="raised" onPress={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {problem ? <HoldsCard holds={problem.holds} /> : null}
        <View style={styles.facts}>
          <View style={[styles.fact, { borderBottomColor: colors.divider }]}>
            <AppText tone="muted">Board</AppText>
            <AppText variant="bodyStrong" style={styles.factValue}>
              {describeConfiguration(selection.configuration)}
            </AppText>
          </View>
          {logSummary ? (
            <View style={[styles.fact, { borderBottomColor: colors.divider }]}>
              <AppText tone="muted">Attempts</AppText>
              <AppText variant="bodyStrong" style={styles.factValue}>
                {logSummary.sessionAttempts} today · {logSummary.lifetimeAttempts} all time
              </AppText>
            </View>
          ) : null}
        </View>
        {logSummary ? <HistoryCard days={logSummary.days} today={today} /> : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: spacing.sm, opacity: 0.6 },
  sheetTitleCol: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  facts: { gap: 0 },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  factValue: { flexShrink: 1, textAlign: 'right' },
});
