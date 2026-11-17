import { StyleSheet, View } from 'react-native';
import type { BoardSessionSnapshot } from '@boardclimb/application';
import { AppText, Button, Card, Notice, spacing, useTheme } from '@boardclimb/design-system';
import type { Problem } from '@boardclimb/domain';
import { ConnectionChip } from './ConnectionChip';
import { describeCommand } from './presentation/describeCommand';

interface LightUpPanelProps {
  problem: Problem | null;
  snapshot: BoardSessionSnapshot;
  onLightUp: () => void;
  onOpenBoard: () => void;
}

/** The one place a lighting command starts: an explicit tap on Light up (FR-008). */
export function LightUpPanel({ problem, snapshot, onLightUp, onOpenBoard }: LightUpPanelProps) {
  const { colors } = useTheme();
  const line = problem ? describeCommand(snapshot.command, problem.key) : null;
  const pending = snapshot.command.state === 'pending';
  const needsBoard = snapshot.connection !== 'connected';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <ConnectionChip snapshot={snapshot} onPress={onOpenBoard} />
      </View>

      <Button
        label="Light up"
        variant="primary"
        large
        busy={pending}
        disabled={problem === null}
        accessibilityHint="Sends this problem to the connected board"
        onPress={onLightUp}
      />

      {line?.tone === 'error' ? (
        <Notice
          tone="error"
          title={line.title}
          {...(line.message === undefined ? {} : { message: line.message })}
          {...(needsBoard ? { actionLabel: 'Open boards', onAction: onOpenBoard } : {})}
        />
      ) : line ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.statusBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.divider }]}
        >
          <AppText variant="bodyStrong" tone={line.tone === 'confirmed' ? 'success' : 'default'}>
            {line.title}
          </AppText>
          {line.message ? (
            <AppText tone="muted" variant="caption">
              {line.message}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm,
    borderRadius: 20,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  titleCol: {
    gap: 2,
  },
  sectionCaption: {
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusBox: {
    padding: spacing.md,
    borderRadius: 12,
    gap: 4,
  },
});
