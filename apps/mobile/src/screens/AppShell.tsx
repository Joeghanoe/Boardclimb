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
  const browse = useBrowseSettings(container.settings);
  const navigation = useNavigationStack({ name: 'problems' });
  useResumeOnForeground(container.session);

  if (!browse.loaded) return null;
  const { route } = navigation;
  const openBoard = () => navigation.push({ name: 'board' });

  switch (route.name) {
    case 'problems':
      return (
        <ProblemListScreen
          container={container}
          selection={browse.selection}
          filters={browse.filters}
          onChangeFilters={browse.changeFilters}
          onOpenProblem={(summary) => navigation.push({ name: 'problem', summary })}
          onChooseLayout={() => navigation.push({ name: 'layout' })}
          onOpenBoard={openBoard}
        />
      );
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
}
