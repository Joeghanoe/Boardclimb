import { StyleSheet, View } from 'react-native';
import type { BoardSessionSnapshot } from '@boardclimb/application';
import { AppText, Button, Card, Notice, spacing } from '@boardclimb/design-system';
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
  const line = problem ? describeCommand(snapshot.command, problem.key) : null;
  const pending = snapshot.command.state === 'pending';
  const needsBoard = snapshot.connection !== 'connected';
  return (
    <Card>
      <View style={styles.row}>
        <AppText tone="muted">Board</AppText>
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
        <View accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong" tone={line.tone === 'confirmed' ? 'success' : 'default'}>
            {line.title}
          </AppText>
          {line.message ? <AppText tone="muted">{line.message}</AppText> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
