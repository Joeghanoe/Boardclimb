import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { AppText, Notice, spacing } from '@boardclimb/design-system';
import type { Problem, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { HistoryCard } from './HistoryCard';
import { HoldsCard } from './HoldsCard';
import { LightUpPanel } from './LightUpPanel';
import { LogControls } from './LogControls';
import { ScreenFrame } from './ScreenFrame';
import { catalogErrorCode } from './presentation/catalogErrorCode';
import { describeCatalogError } from './presentation/describeCatalogError';
import { formatGrade } from './presentation/formatGrade';
import { formatRating } from './presentation/formatRating';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useProblemLog } from './useProblemLog';

interface ProblemDetailScreenProps {
  container: AppContainer;
  selection: BoardSelection;
  summary: ProblemSummary;
  onBack: () => void;
  onOpenBoard: () => void;
}

/**
 * One problem: Light up, then log. Opening it and logging never send a lighting command; only the Light up button
 * does (FR-008). Logging and the history work without a board or a network (FR-015).
 */
export function ProblemDetailScreen({
  container,
  selection,
  summary,
  onBack,
  onOpenBoard,
}: ProblemDetailScreenProps) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [failure, setFailure] = useState<ReturnType<typeof describeCatalogError> | null>(null);
  const snapshot = useBoardSnapshot(container.session);
  const log = useProblemLog(container.log, summary.key);

  useEffect(() => {
    let cancelled = false;
    container.browser
      .getProblem(selection.configuration, summary)
      .then((loaded) => {
        if (!cancelled) setProblem(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(describeCatalogError(catalogErrorCode(error)));
      });
    return () => {
      cancelled = true;
    };
  }, [container, selection, summary]);

  const rating = formatRating(summary.rating);
  return (
    <ScreenFrame title={summary.name} onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <View accessible accessibilityLabel={`Grade ${formatGrade(summary.grade)}, ${rating.spoken}`}>
          <AppText variant="display">{formatGrade(summary.grade)}</AppText>
          <AppText tone="muted">{rating.text}</AppText>
        </View>
        <LightUpPanel
          problem={problem}
          snapshot={snapshot}
          onOpenBoard={onOpenBoard}
          onLightUp={() => {
            if (problem) void container.session.lightUp(problem);
          }}
        />
        <LogControls
          summary={log.summary}
          problem={log.problem}
          onAddAttempt={() => void log.addAttempt()}
          onAdjustAttempts={(delta) => void log.adjustAttempts(delta)}
          onSetTop={(value) => void log.setTop(value)}
          onSetFlash={log.setFlash}
        />
        {failure ? <Notice tone="error" title={failure.title} message={failure.action} /> : null}
        {log.summary ? <HistoryCard days={log.summary.days} today={log.today} /> : null}
        {problem ? <HoldsCard holds={problem.holds} /> : null}
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
