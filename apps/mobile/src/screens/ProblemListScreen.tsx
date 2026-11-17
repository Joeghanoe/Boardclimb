import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { AppText, Button, Card, Notice, spacing, useTheme } from '@boardclimb/design-system';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { ConnectionChip } from './ConnectionChip';
import { FilterBar } from './FilterBar';
import { ModeBanner } from './ModeBanner';
import { ProblemRow } from './ProblemRow';
import { ScreenFrame } from './ScreenFrame';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeConfiguration } from './presentation/describeConfiguration';
import { describeManufacturer } from './presentation/describeManufacturer';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useProblemList } from './useProblemList';

interface ProblemListScreenProps {
  container: AppContainer;
  selection: BoardSelection | null;
  filters: ProblemFilters;
  onChangeFilters: (next: ProblemFilters) => void;
  onOpenProblem: (problem: ProblemSummary) => void;
  onChooseLayout: () => void;
  onOpenBoard: () => void;
}

/** Browsing: cached problems first, refreshed in the background. Opening or filtering never touches the board (FR-008). */
export function ProblemListScreen({
  container,
  selection,
  filters,
  onChangeFilters,
  onOpenProblem,
  onChooseLayout,
  onOpenBoard,
}: ProblemListScreenProps) {
  const { colors } = useTheme();
  const list = useProblemList(container.browser, selection, filters);
  const snapshot = useBoardSnapshot(container.session);
  const filtered = filters.minDifficulty !== null || filters.maxDifficulty !== null || filters.minStars > 0;
  const notice = list.notice ? describeCatalogError(list.notice) : null;

  const header = (
    <View style={styles.header}>
      <ModeBanner mode={container.mode} persistent={container.persistent} />
      {selection ? (
        <Card style={styles.board}>
          <View style={styles.boardName}>
            <AppText variant="bodyStrong">{selection.boardName}</AppText>
            <AppText tone="muted" variant="caption">
              {describeManufacturer(selection.configuration.manufacturer)} ·{' '}
              {describeConfiguration(selection.configuration)}
            </AppText>
          </View>
          <Button label="Change layout" onPress={onChooseLayout} />
        </Card>
      ) : null}
      {selection ? <FilterBar filters={filters} onChange={onChangeFilters} /> : null}
      {notice ? <Notice title={notice.title} message={notice.action} /> : null}
    </View>
  );

  const empty = (() => {
    if (list.loading) {
      return (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText tone="muted">Loading problems…</AppText>
        </View>
      );
    }
    if (!selection) {
      return (
        <View style={styles.empty}>
          <AppText variant="title" style={styles.centered}>
            Choose your board layout to see problems
          </AppText>
          <Button label="Choose layout" variant="primary" large onPress={onChooseLayout} />
        </View>
      );
    }
    if (filtered) {
      return (
        <View style={styles.empty}>
          <AppText variant="title" style={styles.centered}>
            No problems match these filters
          </AppText>
          <Button label="Clear filters" onPress={() => onChangeFilters(defaultProblemFilters)} />
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <AppText variant="title" style={styles.centered}>
          No problems for this layout yet
        </AppText>
        <Button label="Choose another layout" onPress={onChooseLayout} />
      </View>
    );
  })();

  return (
    <ScreenFrame title="Problems" headerRight={<ConnectionChip snapshot={snapshot} onPress={onOpenBoard} />}>
      <FlatList
        data={list.items}
        keyExtractor={(problem) => problem.key}
        renderItem={({ item }) => <ProblemRow problem={item} onPress={() => onOpenProblem(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.content}
        onEndReachedThreshold={0.5}
        onEndReached={() => void list.loadMore()}
        refreshControl={
          selection ? <RefreshControl refreshing={false} onRefresh={() => void list.refresh()} /> : undefined
        }
      />
    </ScreenFrame>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  board: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  boardName: { flexShrink: 1 },
  empty: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl },
  centered: { textAlign: 'center' },
  separator: { height: spacing.sm },
});
