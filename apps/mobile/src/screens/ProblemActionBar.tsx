import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BoardSessionSnapshot, LogOutcome } from '@boardclimb/application';
import {
  AppText,
  Button,
  IconButton,
  Notice,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { LogSummary, Problem } from '@boardclimb/domain';
import { describeCommand } from './presentation/describeCommand';
import { describeLogError } from './presentation/describeLogError';
import type { Guidance } from './presentation/Guidance';

export interface ProblemActionBarProps {
  summary: LogSummary | null;
  logGuidance: Guidance | null;
  snapshot: BoardSessionSnapshot;
  problem: Problem | null;
  onAddAttempt: () => void;
  onAdjustAttempts: (delta: number) => void;
  onSetTop: (value: boolean) => void;
  onSetFlash: (value: boolean, acknowledge?: boolean) => Promise<LogOutcome>;
  onLightUp: () => void;
  onOpenBoard: () => void;
  /** Present only for a problem the board can mirror (Tension). */
  flip?: { on: boolean; onChange: (next: boolean) => void };
}

/**
 * The thumb zone under the board, one row: the attempt stepper, Flash and Top switches, and the yellow
 * yellow Light up (the only control that may light the board). Every control is at least 44 points.
 */
export function ProblemActionBar({
  summary,
  logGuidance,
  snapshot,
  problem,
  onAddAttempt,
  onAdjustAttempts,
  onSetTop,
  onSetFlash,
  onLightUp,
  onOpenBoard,
  flip,
}: ProblemActionBarProps) {
  const { colors } = useTheme();
  const [confirmingFlash, setConfirmingFlash] = useState(false);

  const commandLine = problem ? describeCommand(snapshot.command, problem.key) : null;
  const isPending = snapshot.command.state === 'pending';
  const needsBoard = snapshot.connection !== 'connected';
  const status = commandLine && commandLine.tone !== 'error' ? commandLine : null;
  const canLightUp = problem !== null;
  const minusDisabled = summary === null || summary.sessionManualAttempts <= 0;
  const ready = summary !== null;

  const handlePressFlash = async () => {
    if (!summary) return;
    const nextValue = !summary.flash;
    const outcome = await onSetFlash(nextValue);
    if (!outcome.ok && outcome.code === 'flash_conflicts_with_failed_attempts') {
      setConfirmingFlash(true);
    } else {
      setConfirmingFlash(false);
    }
  };

  const handleConfirmFlash = async () => {
    await onSetFlash(true, true);
    setConfirmingFlash(false);
  };

  const flashConflict = describeLogError('flash_conflicts_with_failed_attempts');

  const top = summary?.top ?? false;
  const flash = summary?.flash ?? false;

  return (
    <View style={styles.container}>
      {confirmingFlash ? (
        <View style={styles.alertArea}>
          <Notice
            tone="error"
            title={flashConflict.title}
            message={flashConflict.action}
            actionLabel="Mark as flash anyway"
            onAction={() => void handleConfirmFlash()}
          />
          <Button label="Cancel flash" variant="charcoal" onPress={() => setConfirmingFlash(false)} />
        </View>
      ) : null}

      {logGuidance ? (
        <View style={styles.alertArea}>
          <Notice tone="error" title={logGuidance.title} message={logGuidance.action} />
        </View>
      ) : null}

      {commandLine?.tone === 'error' ? (
        <View style={styles.alertArea}>
          <Notice
            tone="error"
            title={commandLine.title}
            {...(commandLine.message === undefined ? {} : { message: commandLine.message })}
            {...(needsBoard ? { actionLabel: 'Open boards', onAction: onOpenBoard } : {})}
          />
        </View>
      ) : null}

      {status ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.statusLine, { backgroundColor: colors.surfaceCharcoalRaised }]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status.tone === 'confirmed' ? colors.success : colors.primary },
            ]}
          />
          <AppText variant="caption" tone="inverse" style={styles.statusText} numberOfLines={2}>
            {status.title}
            {status.message ? (
              <AppText variant="caption" tone="inverseMuted">
                {'  '}
                {status.message}
              </AppText>
            ) : null}
          </AppText>
        </View>
      ) : null}

      <View style={styles.row}>
        <IconButton
          icon="minus"
          label={`Remove attempt, ${summary?.sessionAttempts ?? 0} today`}
          variant="raised"
          size={SIZE}
          disabled={minusDisabled}
          onPress={() => onAdjustAttempts(-1)}
        />
        <IconButton
          icon="plus"
          label={`Add attempt, ${summary?.sessionAttempts ?? 0} today`}
          variant="raised"
          size={SIZE}
          disabled={!ready}
          onPress={onAddAttempt}
        />
        <IconButton
          icon="bolt"
          label="Flash"
          size={SIZE}
          checked={flash}
          disabled={!ready}
          variant={flash ? 'solid' : 'raised'}
          fill={colors.accent}
          onFill={colors.onAccent}
          onPress={() => void handlePressFlash()}
        />
        <IconButton
          icon="check"
          label="Top"
          size={SIZE}
          checked={top}
          disabled={!ready}
          variant={top ? 'solid' : 'raised'}
          fill={colors.success}
          onFill={colors.onSuccess}
          onPress={() => {
            setConfirmingFlash(false);
            onSetTop(!top);
          }}
        />
        {flip ? (
          <IconButton
            icon="swap"
            label="Flip"
            size={SIZE}
            checked={flip.on}
            variant={flip.on ? 'solid' : 'raised'}
            fill={colors.primary}
            onFill={colors.onPrimary}
            accessibilityHint="Shows and lights the problem mirrored left to right"
            onPress={() => flip.onChange(!flip.on)}
          />
        ) : null}
        <IconButton
          icon="bulb"
          label="Light up"
          size={SIZE}
          variant="solid"
          fill={colors.primary}
          onFill={colors.onPrimary}
          busy={isPending}
          disabled={!canLightUp}
          accessibilityHint={needsBoard ? 'Opens boards to connect first' : 'Sends this problem to the board'}
          onPress={needsBoard ? onOpenBoard : onLightUp}
        />
      </View>
    </View>
  );
}

/** Six controls fit a 320-point screen at this size, above the 44-point minimum. */
const SIZE = 48;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  alertArea: { gap: spacing.xs },
  statusLine: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { flex: 1, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
