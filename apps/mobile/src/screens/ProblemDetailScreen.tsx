import { useEffect, useRef, useState } from 'react';
import { useDelayedFlag } from './useDelayedFlag';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BoardSelection } from '@boardclimb/application';
import {
  condensedSize,
  AppText,
  BLOCKS,
  Button,
  GradientBackdrop,
  IconButton,
  Reveal,
  motion,
  ThemeContext,
  darkTheme,
  radii,
  spacing,
  useTheme,
  typography,
} from '@boardclimb/design-system';
import type { BoardGeometry, GradeSystem, Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { BoardMap } from './BoardMap';
import { ConnectionChip } from './ConnectionChip';
import { ProblemActionBar } from './ProblemActionBar';
import { ProblemDetailsSheet } from './ProblemDetailsSheet';
import { catalogErrorCode } from './presentation/catalogErrorCode';
import { describeCatalogError } from './presentation/describeCatalogError';
import { displayGrade } from './presentation/displayGrade';
import { formatGrade } from './presentation/formatGrade';
import { gradeBand } from './presentation/gradeBand';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';
import { formatRating } from './presentation/formatRating';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useProblemLog } from './useProblemLog';

/** Space around the board: sides line up with the header, and the bottom keeps it clear of the action bar. */
const CANVAS_INSET_X = spacing.lg;
const CANVAS_INSET_BOTTOM = spacing.lg;

interface ProblemDetailScreenProps {
  container: AppContainer;
  selection: BoardSelection;
  summary: ProblemSummary;
  gradeScale: GradeSystem;
  onBack: () => void;
  onOpenBoard: () => void;
  /** Absent at either end of the browsed list. */
  /** The problems either side in the browsed list, read ahead. */
  neighbours: readonly ProblemSummary[];
  /** Which side the last step came from, so the new problem slides in from there. */
  enterFrom?: 1 | -1;
  /** Next was tapped at the end of what is loaded and more are on the way. */
  loadingNext?: boolean;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

/**
 * The board-first problem screen, always dark like the wall it mirrors: grade and name on top, the full
 * board in the middle, and the log and Light up controls in the thumb zone. Lighting only on Light up.
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
  loadingNext = false,
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
  const current = problem?.key === summary.key ? problem : (loaded.current.get(summary.key) ?? null);
  const drawn = current ?? problem;
  // Say we are loading only if it takes long enough to notice; a quick load just fades the board in.
  const slow = useDelayedFlag(!(drawn && geometry !== undefined), 700);

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
      <View style={[styles.glow, { height: insets.top + 220 }]}>
        <GradientBackdrop
          from={BLOCKS[glow.from].bg}
          to={BLOCKS[glow.to].bg}
          glow={false}
          fadeTo={colors.background}
        />
      </View>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.toolbar}>
            <IconButton icon="back" label="Back" variant="raised" onPress={onBack} />
            <View style={styles.toolbarRight}>
              <ConnectionChip snapshot={snapshot} onPress={onOpenBoard} surface="charcoal" />
              <IconButton
                icon="info"
                label="Details"
                variant="raised"
                accessibilityHint="Holds, setter, history and attempt corrections"
                onPress={() => setShowDetails(true)}
              />
            </View>
          </View>

          <View style={styles.identity} accessibilityRole="header">
            <Reveal
              trigger={summary.key}
              fromX={14 * enterFrom}
              duration={motion.quick}
              style={styles.identityMain}
            >
              <View
                accessible
                accessibilityLabel={`Grade ${formatGrade(summary.grade)}`}
                style={[styles.gradeBlock, { backgroundColor: block.bg }]}
              >
                <AppText
                  variant="display"
                  style={[styles.grade, { color: block.on }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {grade}
                </AppText>
              </View>
              <View style={styles.nameBlock}>
                <AppText variant="display" numberOfLines={2} style={styles.name}>
                  {summary.name}
                </AppText>
                <AppText
                  variant="caption"
                  tone="muted"
                  numberOfLines={1}
                  accessibilityLabel={`${rating.spoken}${angle === null ? '' : `, ${angle} degrees`}`}
                >
                  {rating.text}
                  {angle === null ? '' : `  ·  ${angle}°`}
                </AppText>
              </View>
            </Reveal>
            <View style={styles.stepper}>
              <IconButton
                icon="back"
                label="Previous problem"
                variant="raised"
                disabled={!onPrevious}
                onPress={() => onPrevious?.()}
              />
              <IconButton
                icon="chevronRight"
                label="Next problem"
                variant="raised"
                busy={loadingNext}
                disabled={!onNext}
                onPress={() => onNext?.()}
              />
            </View>
          </View>
        </View>

        {/* 2. Full-board dark canvas: takes all remaining height, no vertical scroll needed */}
        <View
          style={styles.canvasContainer}
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
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(spacing.sm, insets.bottom - spacing.lg),
            },
          ]}
        >
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
            onOpenDetails={() => setShowDetails(true)}
          />
        </View>
      </View>

      {/* 4. Secondary dismissible Details view/sheet */}
      <ProblemDetailsSheet
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        selection={selection}
        summary={summary}
        problem={current}
        logSummary={log.summary}
        today={log.today}
        onAdjustAttempts={(delta) => void log.adjustAttempts(delta)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gradeBlock: {
    width: 56,
    height: 56,
    borderRadius: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: condensedSize(24),
  /**
   * Always as tall as a two-line name plus the rating, with both pinned to the bottom: stepping between short and
   * long names never moves the board, and a short name keeps its rating right under it.
   */
  nameBlock: {
    flex: 1,
    gap: 2,
    height: condensedSize(26).lineHeight * 2 + 2 + typography.caption.lineHeight,
    justifyContent: 'flex-end',
  },
  stepper: { flexDirection: 'row', gap: spacing.sm },
  identityMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: condensedSize(26),
  glow: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.32 },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
  },
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
