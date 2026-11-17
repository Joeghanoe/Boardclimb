import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Notice,
  Stepper,
  ToggleButton,
  spacing,
  useTheme,
} from '@boardclimb/design-system';
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
  const { colors } = useTheme();
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
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="caption" tone="muted" style={styles.sectionCaption}>
          CLIMBER LOG
        </AppText>
        <AppText variant="bodyStrong">Attempts & Sends</AppText>
      </View>

      {/* Sporty athletic stats layout inspired by BLOC reference */}
      <View style={styles.totals} accessibilityLiveRegion="polite">
        <View style={[styles.statBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.divider }]}>
          <AppText tone="muted" variant="caption" style={styles.statLabel}>
            TODAY
          </AppText>
          <AppText variant="display" style={styles.statValue}>
            {summary ? summary.sessionAttempts : '–'}
          </AppText>
          <AppText tone="muted" variant="caption">
            {summary ? formatAttempts(summary.sessionAttempts) : 'attempts'}
          </AppText>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.divider }]}>
          <AppText tone="muted" variant="caption" style={styles.statLabel}>
            ALL TIME
          </AppText>
          <AppText variant="display" style={styles.statValue}>
            {summary ? summary.lifetimeAttempts : '–'}
          </AppText>
          <AppText tone="muted" variant="caption">
            {summary ? formatAttempts(summary.lifetimeAttempts) : 'attempts'}
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button
            label="Add attempt"
            variant="secondary"
            large
            disabled={!ready}
            accessibilityHint="Adds one attempt today. Long press to edit the count."
            onPress={onAddAttempt}
            onLongPress={() => setEditing(true)}
          />
        </View>
        <Button
          label={editing ? 'Done' : 'Edit count'}
          disabled={!ready}
          onPress={() => setEditing((open) => !open)}
        />
      </View>

      {editing && summary ? (
        <View style={[styles.editor, { backgroundColor: colors.surfaceMuted, borderColor: colors.divider }]}>
          <AppText tone="muted" variant="caption">
            Attempts added today (manual adjustments)
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

      <View style={styles.toggleRow}>
        <View style={styles.toggleItem}>
          <ToggleButton
            label="Top"
            value={summary?.top ?? false}
            disabled={!ready}
            onValueChange={(value) => {
              setConfirmingFlash(false);
              onSetTop(value);
            }}
          />
        </View>
        <View style={styles.toggleItem}>
          <ToggleButton
            label="Flash"
            value={summary?.flash ?? false}
            disabled={!ready}
            onValueChange={(value) => void askFlash(value)}
          />
        </View>
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
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  sectionCaption: {
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  totals: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
  },
  statValue: {
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  editor: {
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleItem: {
    flex: 1,
  },
});
