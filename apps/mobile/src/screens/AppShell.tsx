import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Reveal, motion } from '@boardclimb/design-system';
import type { ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { BoardScreen } from './BoardScreen';
import type { BrowsedList } from './BrowsedList';
import { DiagnosticsScreen } from './DiagnosticsScreen';
import { LayoutScreen } from './LayoutScreen';
import { ProblemDetailScreen } from './ProblemDetailScreen';
import { ProblemListScreen } from './ProblemListScreen';
import { useBrowseSettings } from './useBrowseSettings';
import { useNavigationStack } from './useNavigationStack';
import { useResumeOnForeground } from './useResumeOnForeground';

interface AppShellProps {
  container: AppContainer;
}

/** Chooses the screen for the current route. Browsing is the home screen; the board is one tap away, never required. */
export function AppShell({ container }: AppShellProps) {
  const [mode, setMode] = useState<'board' | 'downloaded' | null>(null);
  const [search, setSearch] = useState('');
  const [browsed, setBrowsed] = useState<BrowsedList>({
    items: [],
    hasMore: false,
    loadMore: () => Promise.resolve(),
  });
  /** Next was tapped at the end of what is loaded: step as soon as more arrive. */
  const [waitingAfter, setWaitingAfter] = useState<string | null>(null);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const browse = useBrowseSettings(container.settings);
  const navigation = useNavigationStack({ name: 'problems' });
  useResumeOnForeground(container.session);
  const reportList = useCallback((list: BrowsedList) => setBrowsed(list), []);

  // Direction of the last screen change, so pushes slide in from the right and Back from the left.
  const lastDepth = useRef(navigation.depth);
  const forward = navigation.depth >= lastDepth.current;
  useEffect(() => {
    lastDepth.current = navigation.depth;
  }, [navigation.depth]);

  const shownKey = navigation.route.name === 'problem' ? navigation.route.summary.key : null;
  const shownIndex = shownKey === null ? -1 : browsed.items.findIndex((item) => item.key === shownKey);

  // Read ahead: a few problems before the end of what is loaded, ask the list for more.
  useEffect(() => {
    if (shownIndex >= 0 && browsed.hasMore && shownIndex >= browsed.items.length - 4) void browsed.loadMore();
  }, [shownIndex, browsed]);

  if (!browse.loaded) return null;
  const { route } = navigation;
  const openBoard = () =>
    navigation.push({
      name: 'board',
      selection: route.name === 'problem' ? route.selection : browse.selection,
    });
  const selectionFor = async (summary: ProblemSummary) => {
    if (
      !browse.selection ||
      browse.selection.configuration.id !== summary.configurationId ||
      browse.selection.configuration.manufacturer !== summary.manufacturer
    )
      return container.directory.selectionFor(summary);
    return browse.selection;
  };
  const neighbour = (summary: ProblemSummary, step: 1 | -1) => {
    const index = browsed.items.findIndex((item) => item.key === summary.key);
    return index < 0 ? undefined : browsed.items[index + step];
  };
  const stepTo = (target: ProblemSummary, direction: 1 | -1) => {
    setStepDirection(direction);
    void selectionFor(target)
      .then((selection) => navigation.replace({ name: 'problem', summary: target, selection }))
      .catch(() => undefined);
  };
  const nextFor = (summary: ProblemSummary) => {
    const target = neighbour(summary, 1);
    if (target) return () => stepTo(target, 1);
    if (!browsed.hasMore) return undefined;
    return () => {
      setWaitingAfter(summary.key);
      void browsed.loadMore();
    };
  };
  const previousFor = (summary: ProblemSummary) => {
    const target = neighbour(summary, -1);
    return target ? () => stepTo(target, -1) : undefined;
  };
  if (waitingAfter !== null && route.name === 'problem' && route.summary.key === waitingAfter) {
    const target = neighbour(route.summary, 1);
    if (target || !browsed.hasMore) {
      setWaitingAfter(null);
      if (target) stepTo(target, 1);
    }
  }

  const secondary = (() => {
    switch (route.name) {
      case 'problems':
        return null;
      case 'problem':
        return (
          <ProblemDetailScreen
            container={container}
            selection={route.selection}
            summary={route.summary}
            gradeScale={browse.gradeScale}
            onBack={navigation.pop}
            onOpenBoard={openBoard}
            neighbours={[neighbour(route.summary, -1), neighbour(route.summary, 1)].filter(
              (item): item is ProblemSummary => item !== undefined,
            )}
            enterFrom={stepDirection}
            loadingNext={waitingAfter === route.summary.key}
            onPrevious={previousFor(route.summary)}
            onNext={nextFor(route.summary)}
          />
        );
      case 'layout':
        return (
          <LayoutScreen
            container={container}
            current={browse.selection}
            onBack={navigation.pop}
            onChoose={(selection) => {
              setMode('board');
              browse.chooseSelection(selection);
              navigation.pop();
            }}
          />
        );
      case 'board':
        return (
          <BoardScreen
            container={container}
            selection={route.selection}
            onBack={navigation.pop}
            onChooseLayout={() => navigation.replace({ name: 'layout' })}
            onUseLayout={(selection) => {
              setMode('board');
              browse.chooseSelection(selection);
            }}
            onOpenDiagnostics={() => navigation.push({ name: 'diagnostics' })}
          />
        );
      case 'diagnostics':
        return <DiagnosticsScreen container={container} onBack={navigation.pop} />;
    }
  })();
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, display: route.name === 'problems' ? 'flex' : 'none' }}
        accessibilityElementsHidden={route.name !== 'problems'}
        importantForAccessibility={route.name === 'problems' ? 'auto' : 'no-hide-descendants'}
        aria-hidden={route.name !== 'problems'}
      >
        <Reveal
          trigger={route.name === 'problems' ? 'shown' : 'hidden'}
          fromX={forward ? 0 : -28}
          duration={motion.screen}
          style={{ flex: 1 }}
        >
          <ProblemListScreen
            container={container}
            active={route.name === 'problems'}
            downloaded={(mode ?? (browse.selection ? 'board' : 'downloaded')) === 'downloaded'}
            search={search}
            onChangeDownloaded={(value) => setMode(value ? 'downloaded' : 'board')}
            onChangeSearch={setSearch}
            selection={browse.selection}
            filters={browse.filters}
            onChangeFilters={browse.changeFilters}
            gradeScale={browse.gradeScale}
            onChangeGradeScale={browse.changeGradeScale}
            onOpenProblem={async (summary) => {
              const selection = await selectionFor(summary);
              navigation.push({ name: 'problem', summary, selection });
            }}
            onListChange={reportList}
            onChooseLayout={() => navigation.push({ name: 'layout' })}
            onOpenBoard={openBoard}
          />
        </Reveal>
      </View>
      {secondary ? (
        <Reveal trigger={route.name} fromX={forward ? 28 : -28} duration={motion.screen} style={{ flex: 1 }}>
          {secondary}
        </Reveal>
      ) : null}
    </View>
  );
}
