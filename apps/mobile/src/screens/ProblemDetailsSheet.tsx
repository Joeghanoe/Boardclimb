import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import {
  AppText,
  Button,
  Card,
  Stepper,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { LogSummary, Problem, ProblemSummary } from '@boardclimb/domain';
import { HistoryCard } from './HistoryCard';
import { HoldsCard } from './HoldsCard';
import { describeConfiguration } from './presentation/describeConfiguration';
import { describeManufacturer } from './presentation/describeManufacturer';
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
  onAdjustAttempts: (delta: number) => void;
}

/**
 * Dismissible detail sheet for secondary information: hold breakdown, setter, history and manual attempt adjustments.
 * Keeps the primary climbing screen dark, board-first, and focused.
 */
export function ProblemDetailsSheet({
  visible,
  onClose,
  selection,
  summary,
  problem,
  logSummary,
  today,
  onAdjustAttempts,
}: ProblemDetailsSheetProps) {
  const { colors } = useTheme();
  const rating = formatRating(summary.rating);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss problem details"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.divider }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.divider }]}>
            <View style={styles.sheetTitleCol}>
              <AppText variant="caption" tone="muted" style={styles.eyebrow}>
                PROBLEM DETAILS
              </AppText>
              <AppText variant="title" numberOfLines={1}>
                {summary.name}
              </AppText>
            </View>
            <Button label="Done" variant="secondary" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* 1. Configuration & Setter metadata */}
            <Card style={styles.card}>
              <AppText variant="caption" tone="muted" style={styles.eyebrow}>
                LAYOUT & SETTER
              </AppText>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <AppText variant="caption" tone="muted">
                    BOARD
                  </AppText>
                  <AppText variant="bodyStrong">
                    {describeManufacturer(selection.configuration.manufacturer)}
                  </AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" tone="muted">
                    LAYOUT
                  </AppText>
                  <AppText variant="bodyStrong">{describeConfiguration(selection.configuration)}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" tone="muted">
                    ANGLE
                  </AppText>
                  <AppText variant="bodyStrong">{selection.configuration.angleDegrees}°</AppText>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <AppText variant="caption" tone="muted">
                    GRADE
                  </AppText>
                  <AppText variant="bodyStrong">{formatGrade(summary.grade)}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" tone="muted">
                    RATING
                  </AppText>
                  <AppText variant="bodyStrong">{rating.text}</AppText>
                </View>
                {problem?.setter ? (
                  <View style={styles.metaItem}>
                    <AppText variant="caption" tone="muted">
                      SETTER
                    </AppText>
                    <AppText variant="bodyStrong">{problem.setter}</AppText>
                  </View>
                ) : null}
              </View>
            </Card>

            {/* 2. Manual attempt count editor */}
            {logSummary ? (
              <Card style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <AppText variant="caption" tone="muted" style={styles.eyebrow}>
                    MANUAL ADJUSTMENTS
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {logSummary.sessionAttempts} total today · {logSummary.lifetimeAttempts} all time
                  </AppText>
                </View>
                <AppText tone="muted" variant="caption">
                  Edit attempts added manually today (floors at 0).
                </AppText>
                <Stepper
                  display={String(logSummary.sessionManualAttempts)}
                  valueLabel="Manual attempts today"
                  decrementLabel="Remove one attempt"
                  incrementLabel="Add one attempt"
                  decrementDisabled={logSummary.sessionManualAttempts <= 0}
                  onDecrement={() => onAdjustAttempts(-1)}
                  onIncrement={() => onAdjustAttempts(1)}
                />
              </Card>
            ) : null}

            {/* 3. Holds breakdown */}
            {problem ? <HoldsCard holds={problem.holds} /> : null}

            {/* 4. Session History */}
            {logSummary ? <HistoryCard days={logSummary.days} today={today} /> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
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
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget,
  },
  sheetTitleCol: {
    flex: 1,
    gap: 2,
    marginRight: spacing.md,
  },
  eyebrow: {
    fontWeight: '800',
    letterSpacing: 1.1,
    fontSize: 11,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexBasis: 100,
    flexGrow: 1,
    gap: 2,
  },
});
