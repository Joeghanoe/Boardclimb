import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BoardSessionSnapshot, LogOutcome } from '@boardclimb/application';
import {
  condensedSize,
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
import { LightOnSwipeToggle } from './LightOnSwipeToggle';
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
  /** Switches light on swipe; offered only while this phone is connected (FR-008a). */
  onChangeLightOnSwipe: (next: boolean) => void;
  onOpenBoard: () => void;
  onOpenDetails?: () => void;
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
  onChangeLightOnSwipe,
  onOpenBoard,
  onOpenDetails,
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

      {status || !needsBoard ? (
        <View style={styles.statusRow}>
          {needsBoard ? null : (
            <LightOnSwipeToggle on={snapshot.lightOnSwipe} onChange={onChangeLightOnSwipe} />
          )}
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
        </View>
      ) : null}

      <View style={styles.logRow}>
        <View style={[styles.stepper, { backgroundColor: colors.surfaceCharcoalRaised }]}>
          <IconButton
            icon="minus"
            label="Remove attempt"
            accessibilityHint="Removes one attempt today"
            variant="raised"
            disabled={minusDisabled}
            onPress={() => onAdjustAttempts(-1)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${summary?.sessionAttempts ?? 0} attempts today. Opens details and history.`}
            {...(onOpenDetails === undefined ? {} : { onPress: onOpenDetails })}
            style={styles.count}
          >
            <AppText variant="numeral" tone="inverse" style={styles.countValue}>
              {summary ? summary.sessionAttempts : 0}
            </AppText>
            <AppText variant="eyebrow" tone="inverseMuted" style={styles.countLabel}>
              Attempts
            </AppText>
          </Pressable>
          <IconButton
            icon="plus"
            label="Add attempt"
            accessibilityHint="Adds one attempt today"
            variant="raised"
            disabled={!ready}
            onPress={onAddAttempt}
          />
        </View>

        <View style={styles.switches}>
          <IconButton
            icon="bolt"
            label="Flash"
            caption="Flash"
            size={50}
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
            caption="Top"
            size={50}
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
        </View>
        <IconButton
          icon="bulb"
          label="Light up"
          caption="Light up"
          size={50}
          variant="solid"
          fill={colors.primary}
          onFill={colors.onPrimary}
          busy={isPending}
          disabled={!canLightUp}
          accessibilityHint="Sends this problem to the connected board"
          onPress={onLightUp}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  alertArea: { gap: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLine: {
    flex: 1,
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
  switches: { flexDirection: 'row', gap: spacing.sm + 2 },
  logRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm + 2 },
  stepper: {
    flex: 1,
    minWidth: 124,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.pill,
    padding: 4,
    height: 50,
  },
  count: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: touchTarget },
  countValue: condensedSize(24),
  countLabel: { fontSize: 9, letterSpacing: 1.1 },
});
