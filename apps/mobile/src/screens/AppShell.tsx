import { useState } from 'react';
import { View } from 'react-native';
import type { AppContainer } from '../composition/AppContainer';
import { BoardScreen } from './BoardScreen';
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
  const browse = useBrowseSettings(container.settings);
  const navigation = useNavigationStack({ name: 'problems' });
  useResumeOnForeground(container.session);

  if (!browse.loaded) return null;
  const { route } = navigation;
  const openBoard = () => navigation.push({ name: 'board' });

  const secondary = (() => {
    switch (route.name) {
      case 'problems':
        return null;
      case 'problem':
        return browse.selection ? (
          <ProblemDetailScreen
            container={container}
            selection={browse.selection}
            summary={route.summary}
            onBack={navigation.pop}
            onOpenBoard={openBoard}
          />
        ) : null;
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
            selection={browse.selection}
            onBack={navigation.pop}
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
          onOpenProblem={async (summary) => {
            if (
              !browse.selection ||
              browse.selection.configuration.id !== summary.configurationId ||
              browse.selection.configuration.manufacturer !== summary.manufacturer
            )
              browse.chooseSelection(await container.directory.selectionFor(summary));
            navigation.push({ name: 'problem', summary });
          }}
          onChooseLayout={() => navigation.push({ name: 'layout' })}
          onOpenBoard={openBoard}
        />
      </View>
      {secondary}
    </View>
  );
}
