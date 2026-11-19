import { StyleSheet, View } from 'react-native';
import { AppText, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import type { DaySummary } from '@boardclimb/domain';
import { formatAttempts } from './presentation/formatAttempts';
import { formatSessionDay } from './presentation/formatSessionDay';

interface HistoryCardProps {
  days: readonly DaySummary[];
  today: string;
}

/** Dated history, newest first, as plain rows like the facts above it. Past days keep their date (FR-014). */
export function HistoryCard({ days, today }: HistoryCardProps) {
  const { colors } = useTheme();
  if (days.length === 0) return null;
  return (
    <View>
      <AppText tone="muted" accessibilityRole="header" aria-level={2} style={styles.title}>
        History
      </AppText>
      {days.map((day) => (
        <View key={day.sessionDate} style={[styles.row, { borderBottomColor: colors.divider }]}>
          <AppText>{formatSessionDay(day.sessionDate, today)}</AppText>
          <AppText variant="bodyStrong">{formatAttempts(day.attempts)}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { paddingBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
