import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Notice, Stepper, ToggleButton, spacing } from '@boardclimb/design-system';
import type { LogSummary } from '@boardclimb/domain';
import type { LogOutcome } from '@boardclimb/application';
import { describeLogError } from './presentation/describeLogError';
import { formatAttempts } from './presentation/formatAttempts';
import type { Guidance } from './presentation/Guidance';

interface LogControlsProps {
  summary: LogSummary | null;
  problem: Guidance | null;
  onAddAttempt: () => void;
  onAdjustAttempts: (delta: number) => void;
  onSetTop: (value: boolean) => void;
  onSetFlash: (value: boolean, acknowledge?: boolean) => Promise<LogOutcome>;
}

/** Attempt, Top and Flash. Nothing here can reach the board (FR-008, FR-012, FR-013). */
export function LogControls({
  summary,
  problem,
  onAddAttempt,
  onAdjustAttempts,
  onSetTop,
  onSetFlash,
}: LogControlsProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingFlash, setConfirmingFlash] = useState(false);

  const askFlash = async (value: boolean) => {
    const outcome = await onSetFlash(value);
    setConfirmingFlash(!outcome.ok && outcome.code === 'flash_conflicts_with_failed_attempts');
  };
  const confirmFlash = async () => {
    await onSetFlash(true, true);
    setConfirmingFlash(false);
  };

  const conflict = describeLogError('flash_conflicts_with_failed_attempts');
  const ready = summary !== null;

  return (
    <Card>
      <View style={styles.totals} accessibilityLiveRegion="polite">
        <View style={styles.total}>
          <AppText tone="muted" variant="caption">
            Today
          </AppText>
          <AppText variant="title">{summary ? formatAttempts(summary.sessionAttempts) : '–'}</AppText>
        </View>
        <View style={styles.total}>
          <AppText tone="muted" variant="caption">
            All time
          </AppText>
          <AppText variant="title">{summary ? formatAttempts(summary.lifetimeAttempts) : '–'}</AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button
            label="Add attempt"
            large
            disabled={!ready}
            accessibilityHint="Adds one attempt today. Long press to edit the count."
            onPress={onAddAttempt}
            onLongPress={() => setEditing(true)}
          />
        </View>
        <Button
          label={editing ? 'Done' : 'Edit attempts'}
          disabled={!ready}
          onPress={() => setEditing((open) => !open)}
        />
      </View>

      {editing && summary ? (
        <View style={styles.editor}>
          <AppText tone="muted" variant="caption">
            Attempts added today
          </AppText>
          <Stepper
            display={String(summary.sessionManualAttempts)}
            valueLabel="Attempts added today"
            decrementLabel="Remove one attempt"
            incrementLabel="Add one attempt"
            decrementDisabled={summary.sessionManualAttempts <= 0}
            onDecrement={() => onAdjustAttempts(-1)}
            onIncrement={() => onAdjustAttempts(1)}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <ToggleButton
          label="Top"
          value={summary?.top ?? false}
          disabled={!ready}
          onValueChange={(value) => {
            setConfirmingFlash(false);
            onSetTop(value);
          }}
        />
        <ToggleButton
          label="Flash"
          value={summary?.flash ?? false}
          disabled={!ready}
          onValueChange={(value) => void askFlash(value)}
        />
      </View>

      {confirmingFlash ? (
        <View style={{ gap: spacing.sm }}>
          <Notice
            title={conflict.title}
            message={conflict.action}
            actionLabel="Mark as flash anyway"
            onAction={() => void confirmFlash()}
          />
          <Button label="Cancel flash" onPress={() => setConfirmingFlash(false)} />
        </View>
      ) : null}
      {problem ? <Notice tone="error" title={problem.title} message={problem.action} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  totals: { flexDirection: 'row', gap: spacing.xl },
  total: { gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  editor: { gap: spacing.xs },
});
