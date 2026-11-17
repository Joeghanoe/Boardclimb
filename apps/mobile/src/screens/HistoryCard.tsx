import { StyleSheet, View } from 'react-native';
import { AppText, Card, spacing } from '@boardclimb/design-system';
import type { DaySummary } from '@boardclimb/domain';
import { formatAttempts } from './presentation/formatAttempts';
import { formatSessionDay } from './presentation/formatSessionDay';

interface HistoryCardProps {
  days: readonly DaySummary[];
  today: string;
}

/** Dated history, newest first. Past days keep the date they were logged on (FR-014). */
export function HistoryCard({ days, today }: HistoryCardProps) {
  if (days.length === 0) return null;
  return (
    <Card>
      <AppText variant="bodyStrong" accessibilityRole="header" aria-level={2}>
        History
      </AppText>
      {days.map((day) => (
        <View key={day.sessionDate} style={styles.row}>
          <AppText>{formatSessionDay(day.sessionDate, today)}</AppText>
          <AppText tone="muted">{formatAttempts(day.attempts)}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
