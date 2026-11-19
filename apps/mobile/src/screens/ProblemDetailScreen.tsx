import { useEffect, useMemo, useRef, useState } from 'react';
import { useDelayedFlag } from './useDelayedFlag';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BoardSelection } from '@boardclimb/application';
import {
  displaySize,
  AppText,
  BLOCKS,
  Button,
  GradientBackdrop,
  IconButton,
  Reveal,
  motion,
  ThemeContext,
  darkTheme,
  spacing,
  useTheme,
} from '@boardclimb/design-system';
import type { BoardGeometry, GradeSystem, Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { BoardMap } from './BoardMap';
import { EdgeFade } from './EdgeFade';
import { ProblemActionBar } from './ProblemActionBar';
import { ProblemDetailsSheet } from './ProblemDetailsSheet';
import { catalogErrorCode } from './presentation/catalogErrorCode';
import { describeCatalogError } from './presentation/describeCatalogError';
import { displayGrade } from './presentation/displayGrade';
import { flipProblem } from './presentation/flipProblem';
import { formatAscents } from './presentation/formatAscents';
import { formatGrade } from './presentation/formatGrade';
import { gradeBand } from './presentation/gradeBand';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';
import { formatRating } from './presentation/formatRating';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useProblemLog } from './useProblemLog';

/** Space around the board: sides line up with the header, and the bottom keeps it clear of the action bar. */
const CANVAS_INSET_X = spacing.lg;
const CANVAS_INSET_BOTTOM = spacing.lg;
/** How far a horizontal swipe on the board must travel to step to the next or previous problem. */
const SWIPE_DISTANCE = 56;
/** With light on swipe on, the board follows only a problem the climber stays on this long, not each one flicked past. */
const SETTLE_MS = 350;

interface ProblemDetailScreenProps {
  container: AppContainer;
  selection: BoardSelection;
  summary: ProblemSummary;
  gradeScale: GradeSystem;
  onBack: () => void;
  onOpenBoard: () => void;
  /** The problems either side in the browsed list, read ahead. */
  neighbours: readonly ProblemSummary[];
  /** Which side the last step came from, so the new problem slides in from there. */
  enterFrom?: 1 | -1;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

/**
 * The board-first problem screen, always dark like the wall it mirrors: grade and name on top, the full
 * board in the middle, and the log and Light up controls in the thumb zone. Swiping the board steps between
 * problems. Lighting only on Light up, or on settling on a problem while light on swipe is on (FR-008a).
 */
export function ProblemDetailScreen(props: ProblemDetailScreenProps) {
  return (
    <ThemeContext.Provider value={darkTheme}>
      <ProblemDetail {...props} />
    </ThemeContext.Provider>
  );
}

function ProblemDetail({
  container,
  selection,
  summary,
  gradeScale,
  onBack,
  onOpenBoard,
  neighbours,
  enterFrom = 1,
  onPrevious,
  onNext,
}: ProblemDetailScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [problem, setProblem] = useState<Problem | null>(null);
  // undefined while loading, null when this layout has no geometry.
  const [geometry, setGeometry] = useState<BoardGeometry | null | undefined>(undefined);
  const [failure, setFailure] = useState<ReturnType<typeof describeCatalogError> | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [flippedOn, setFlippedOn] = useState(false);
  const [canvas, setCanvas] = useState<{ width: number; height: number } | null>(null);

  const snapshot = useBoardSnapshot(container.session);
  const log = useProblemLog(container.log, summary.key);

  // Problems already read, by key: the current one and its neighbours, so stepping never blanks the board.
  const loaded = useRef(new Map<ProblemKey, Problem>());
  const neighbourKeys = neighbours.map((item) => item.key).join('|');

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailure(null);
    for (const item of [summary, ...neighbours]) {
      if (loaded.current.has(item.key) && retryCount === 0) continue;
      const current = item.key === summary.key;
      container.browser
        .getProblem(selection.configuration, item)
        .then((result) => {
          loaded.current.set(item.key, result);
          if (current && !cancelled) {
            setProblem(result);
            setFailure(null);
          }
        })
        .catch((error: unknown) => {
          console.error('[ProblemDetailScreen] Failed to load problem:', item.key, error);
          if (current && !cancelled) setFailure(describeCatalogError(catalogErrorCode(error)));
        });
    }
    log.prefetch(neighbours.map((item) => item.key));
    return () => {
      cancelled = true;
    };
    // neighbourKeys stands in for the neighbours array, which is rebuilt on every render.
  }, [container, selection, summary, neighbourKeys, retryCount]);

  useEffect(() => {
    let cancelled = false;
    container.directory
      .geometry(selection.configuration)
      .then((result) => {
        if (!cancelled) setGeometry(result);
      })
      .catch(() => {
        if (!cancelled) setGeometry(null);
      });
    return () => {
      cancelled = true;
    };
  }, [container, selection.configuration]);

  // Only the problem named in the header may be lit; the previous board stays drawn until it is ready.
  const loadedCurrent = problem?.key === summary.key ? problem : (loaded.current.get(summary.key) ?? null);
  // With Flip on, what is drawn and what Light up sends are the mirrored holds; the log key stays the same.
  const current = useMemo(() => flipProblem(loadedCurrent, flippedOn), [loadedCurrent, flippedOn]);
  const drawn = current ?? flipProblem(problem, flippedOn);
  const canFlip = Boolean(loadedCurrent?.mirroredHolds);
  // Say we are loading only if it takes long enough to notice; a quick load just fades the board in.
  const slow = useDelayedFlag(!(drawn && geometry !== undefined), 700);

  // Light on swipe: once the climber settles on a problem, the session decides whether to light it.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => void container.session.showing(current), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [container, current]);

  // Latest step handlers for the gesture, which is created once.
  const steps = useRef({ onPrevious, onNext });
  steps.current = { onPrevious, onNext };
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -SWIPE_DISTANCE) steps.current.onNext?.();
          else if (gesture.dx >= SWIPE_DISTANCE) steps.current.onPrevious?.();
        },
      }),
    [],
  );

  const connected = snapshot.connection === 'connected';
  const lightOnSwipe = connected && snapshot.lightOnSwipe;
  const rating = formatRating(summary.rating);
  const grade = displayGrade(summary.grade, gradeScale);
  const angle = selection.configuration.angleDegrees;
  const block = BLOCKS[gradeBand(summary.grade)];
  const glow = manufacturerBlocks(selection.configuration.manufacturer);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.glow, { height: insets.top + 160 }]}>
        <GradientBackdrop
          from={BLOCKS[glow.from].bg}
          to={BLOCKS[glow.to].bg}
          glow={false}
          fadeTo={colors.background}
        />
      </View>
      <View style={styles.column}>
        <View style={styles.toolbar}>
          <IconButton icon="back" label="Back" variant="glass" onPress={onBack} />
          <View style={styles.spacer} />
          <IconButton
            icon="board"
            label="Light on swipe"
            variant={lightOnSwipe ? 'solid' : 'glass'}
            fill={colors.primary}
            onFill={colors.onPrimary}
            checked={lightOnSwipe}
            accessibilityHint={
              connected ? 'Lights each problem you swipe to on the board' : 'Opens boards to connect first'
            }
            onPress={() => {
              if (!connected) return onOpenBoard();
              // Switching it on is an explicit request: the problem on screen lights straight away.
              if (container.session.setLightOnSwipe(!snapshot.lightOnSwipe) && current)
                void container.session.showing(current);
            }}
          />
          <IconButton
            icon="info"
            label="Details"
            variant="glass"
            accessibilityHint="Holds, setter, history and attempt corrections"
            onPress={() => setShowDetails(true)}
          />
        </View>
        <Reveal trigger={summary.key} fromX={14 * enterFrom} duration={motion.quick} style={styles.identity}>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${summary.name}, grade ${formatGrade(summary.grade)}, ${rating.spoken}${angle === null ? '' : `, ${angle} degrees`}`}
          >
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
              {summary.name}
            </AppText>
            {summary.setter ? (
              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.setter}>
                {summary.setter}
              </AppText>
            ) : null}
            <View style={styles.meta}>
              <View style={[styles.gradeTag, { backgroundColor: block.bg }]}>
                <AppText variant="title" style={[styles.gradeText, { color: block.on }]} numberOfLines={1}>
                  {grade}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {[rating.text, formatAscents(summary.ascents), angle === null ? null : `${angle}°`]
                  .filter(Boolean)
                  .join('  ·  ')}
              </AppText>
            </View>
          </View>
        </Reveal>

        {/* 2. Full-board dark canvas: takes all remaining height, no vertical scroll needed */}
        <View
          style={styles.canvasContainer}
          {...swipe.panHandlers}
          accessible
          accessibilityLabel="Board. Swipe left or right for the next or previous problem"
          accessibilityActions={[
            ...(onNext ? [{ name: 'next', label: 'Next problem' }] : []),
            ...(onPrevious ? [{ name: 'previous', label: 'Previous problem' }] : []),
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'next') onNext?.();
            if (event.nativeEvent.actionName === 'previous') onPrevious?.();
          }}
          onLayout={(event) => {
            const width = Math.round(event.nativeEvent.layout.width) - CANVAS_INSET_X * 2;
            const height = Math.round(event.nativeEvent.layout.height) - CANVAS_INSET_BOTTOM;
            if (width > 0 && height > 0 && (width !== canvas?.width || height !== canvas.height))
              setCanvas({ width, height });
          }}
        >
          {drawn && geometry !== undefined && canvas ? (
            <Reveal trigger={drawn.key} fromX={20 * enterFrom} duration={motion.content}>
              <BoardMap
                problem={drawn}
                geometry={geometry}
                maxWidth={canvas.width}
                maxHeight={canvas.height}
              />
            </Reveal>
          ) : failure ? (
            <View style={styles.centeredMessage}>
              <AppText variant="bodyStrong" tone="danger">
                {failure.title}
              </AppText>
              <AppText tone="muted" variant="caption" style={styles.centeredSubtext}>
                {failure.action}
              </AppText>
              <Button label="Try again" variant="primary" onPress={() => setRetryCount((c) => c + 1)} />
            </View>
          ) : slow ? (
            <View style={styles.centeredMessage}>
              <AppText tone="muted">Loading board layout…</AppText>
            </View>
          ) : null}
        </View>

        {/* 3. Compact bottom action bar: - attempt, Top, Flash, + attempt, Light up */}
        <View style={[styles.sheet, { paddingBottom: Math.max(spacing.sm, insets.bottom - spacing.lg) }]}>
          {/* The board drawing fades out behind the controls, so they always stand out. */}
          <View style={styles.sheetFade} pointerEvents="none">
            <EdgeFade color={colors.background} edge="bottom" />
          </View>
          <ProblemActionBar
            summary={log.summary}
            logGuidance={log.problem}
            snapshot={snapshot}
            problem={current}
            onAddAttempt={() => void log.addAttempt()}
            onAdjustAttempts={(delta) => void log.adjustAttempts(delta)}
            onSetTop={(val) => void log.setTop(val)}
            onSetFlash={log.setFlash}
            onLightUp={() => {
              if (current) void container.session.lightUp(current);
            }}
            onOpenBoard={onOpenBoard}
            {...(canFlip ? { flip: { on: flippedOn, onChange: setFlippedOn } } : {})}
          />
        </View>
      </View>

      {/* 4. Secondary dismissible Details view/sheet */}
      <ProblemDetailsSheet
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        selection={selection}
        summary={summary}
        problem={loadedCurrent}
        logSummary={log.summary}
        today={log.today}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  spacer: { flex: 1 },
  identity: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  name: { textAlign: 'center', fontSize: 17 },
  setter: { textAlign: 'center' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  gradeTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  gradeText: { ...displaySize(14), letterSpacing: -0.3 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.32 },
  sheet: { paddingTop: spacing.xs },
  sheetFade: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: 56 },
  canvasContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: CANVAS_INSET_X,
    paddingBottom: CANVAS_INSET_BOTTOM,
  },
  centeredMessage: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },
  centeredSubtext: { textAlign: 'center', maxWidth: 320 },
});
