import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  BLOCKS,
  Button,
  GradientBackdrop,
  Icon,
  IconButton,
  Notice,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { GradeSystem, ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { BoardBadge } from './BoardBadge';
import { ConnectionChip } from './ConnectionChip';
import { FilterBar } from './FilterBar';
import { ModeBanner } from './ModeBanner';
import type { BrowsedList } from './BrowsedList';
import { ProblemRow } from './ProblemRow';
import { StartTile } from './StartTile';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeManufacturer } from './presentation/describeManufacturer';
import { isOfflineWithoutBoardList } from './presentation/isOfflineWithoutBoardList';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useConfigurationLabels } from './useConfigurationLabels';
import { useProblemList } from './useProblemList';

/** What the app is for, in the order a climber does it. */
const START_STEPS = [
  'Find the board at your gym',
  'Stand at the wall and connect',
  'Pick a problem, tap Light up and log your send',
];

interface ProblemListScreenProps {
  container: AppContainer;
  active: boolean;
  search: string;
  onChangeSearch: (value: string) => void;
  selection: BoardSelection | null;
  filters: ProblemFilters;
  onChangeFilters: (next: ProblemFilters) => void;
  gradeScale: GradeSystem;
  onChangeGradeScale: (scale: GradeSystem) => void;
  onOpenProblem: (problem: ProblemSummary) => Promise<void>;
  /** Reports the list as loaded, so the problem screen can step through it and ask for more. */
  onListChange: (list: BrowsedList) => void;
  onChooseLayout: () => void;
  onOpenBoard: () => void;
  onOpenGyms: () => void;
}

/** Browsing: cached problems first, refreshed in the background. Opening or filtering never touches the board (FR-008). */
export function ProblemListScreen({
  container,
  active,
  search,
  onChangeSearch: setSearch,
  selection,
  filters,
  onChangeFilters,
  gradeScale,
  onChangeGradeScale,
  onOpenProblem,
  onListChange,
  onChooseLayout,
  onOpenBoard,
  onOpenGyms,
}: ProblemListScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const labels = useConfigurationLabels(container.directory);
  const [openFailed, setOpenFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  /** Once rows pass under the status bar, a strip behind it keeps the clock readable. */
  const [scrolled, setScrolled] = useState(false);
  const boardId = selection ? `${selection.configuration.manufacturer}/${selection.configuration.id}` : null;
  useEffect(() => setOffline(false), [boardId]);
  const downloaded = offline || selection === null;
  const list = useProblemList(
    container.browser,
    downloaded ? null : selection,
    filters,
    downloaded ? search : '',
  );
  const snapshot = useBoardSnapshot(container.session);
  useEffect(() => {
    if (selection && !offline && isOfflineWithoutBoardList({ ...list, itemCount: list.items.length }))
      setOffline(true);
  }, [selection, offline, list]);
  useEffect(() => {
    onListChange({ items: list.items, hasMore: list.hasMore, loadMore: list.loadMore });
  }, [onListChange, list.items, list.hasMore, list.loadMore]);
  const filtered = filters.minDifficulty !== null || filters.maxDifficulty !== null || filters.minStars > 0;
  const notice = list.notice ? describeCatalogError(list.notice) : null;

  const blocks = manufacturerBlocks(selection ? selection.configuration.manufacturer : null);
  const header = (
    <View style={styles.header}>
      <View style={[styles.band, { paddingTop: insets.top + spacing.sm }]}>
        <GradientBackdrop
          from={BLOCKS[blocks.from].bg}
          to={BLOCKS[blocks.to].bg}
          fadeTo={colors.background}
        />
        <View style={styles.bar}>
          <View style={styles.barStart}>
            <BoardBadge selection={selection} onPress={onChooseLayout} />
            <FilterBar
              filters={filters}
              onChange={onChangeFilters}
              gradeScale={gradeScale}
              onChangeGradeScale={onChangeGradeScale}
              surface="glass"
            />
          </View>
          <View style={styles.barEnd}>
            <IconButton icon="pin" label="Gym map" variant="glass" onPress={onOpenGyms} />
            <ConnectionChip snapshot={snapshot} onPress={onOpenBoard} surface="glass" compact />
          </View>
        </View>
      </View>

      {offline ? (
        <Notice
          title="You’re offline"
          message="Showing downloaded problems."
          actionLabel="Try again"
          onAction={() => setOffline(false)}
        />
      ) : null}
      {offline ? (
        <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
          <Icon name="search" color={colors.textMuted} size={18} />
          <TextInput
            accessibilityLabel="Search downloaded problems"
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { color: colors.text }]}
          />
        </View>
      ) : null}
      <ModeBanner mode={container.mode} persistent={container.persistent} compatibility={false} />
      {openFailed ? (
        <Notice
          tone="error"
          title="Could not open that layout"
          message="Choose the problem’s board layout and try again."
        />
      ) : null}
      {notice && list.items.length > 0 && !offline ? (
        <Notice title={notice.title} message={notice.action} />
      ) : null}
    </View>
  );

  const empty = (() => {
    if (list.loading) {
      return (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText tone="muted" variant="bodyStrong">
            Loading problems…
          </AppText>
        </View>
      );
    }
    if (notice && list.items.length === 0) {
      return (
        <View style={styles.empty} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <AppText variant="title" style={styles.centered}>
            {notice.title}
          </AppText>
          <AppText tone="muted" style={styles.centered}>
            {notice.action}
          </AppText>
          <Button label="Try again" variant="primary" onPress={() => void list.refresh()} />
          {!downloaded ? <Button label="Choose another layout" onPress={onChooseLayout} /> : null}
        </View>
      );
    }
    if (!selection && !search && !filtered) {
      return (
        // First run: nothing chosen yet, so say in three steps what the app is for.
        <View style={[styles.empty, styles.start]}>
          <AppText variant="title" style={styles.centered} accessibilityRole="header">
            Light up your board
          </AppText>
          <View style={styles.steps}>
            {START_STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: colors.surface }]}>
                  <AppText variant="label">{index + 1}</AppText>
                </View>
                <AppText style={styles.stepText}>{step}</AppText>
              </View>
            ))}
          </View>
          <View style={styles.tiles}>
            <StartTile label="Search for board" icon="board" primary onPress={onOpenBoard} />
            <StartTile label="Find my gym" icon="pin" onPress={onOpenGyms} />
          </View>
        </View>
      );
    }
    if (downloaded) {
      return (
        <View style={styles.empty}>
          <AppText variant="title" style={styles.centered}>
            {search || filtered ? 'No downloaded problems match' : 'No downloaded problems yet'}
          </AppText>
          {search ? <Button label="Clear search" onPress={() => setSearch('')} /> : null}
          {filtered ? (
            <Button label="Clear filters" onPress={() => onChangeFilters(defaultProblemFilters)} />
          ) : null}
          <Button label="Find my board" onPress={onOpenBoard} />
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
    <View
      style={[
        styles.page,
        { backgroundColor: colors.background, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
      {...(active ? { role: 'main' as const } : {})}
    >
      <View
        pointerEvents="none"
        style={[styles.overscroll, { backgroundColor: BLOCKS[blocks.from].bg, opacity: 0.9 }]}
      />
      <FlatList
        data={list.items}
        keyExtractor={(problem) => problem.key}
        renderItem={({ item, index }) => (
          <ProblemRow
            problem={item}
            last={index === list.items.length - 1}
            gradeScale={gradeScale}
            {...(downloaded
              ? {
                  context:
                    labels.get(`${item.manufacturer}/${item.configurationId}`) ??
                    describeManufacturer(item.manufacturer),
                }
              : {})}
            onPress={() => {
              setOpenFailed(false);
              void onOpenProblem(item).catch(() => setOpenFailed(true));
            }}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          list.items.length === 0 ? undefined : (
            <View style={styles.footer}>
              {list.hasMore ? (
                <ActivityIndicator color={colors.textMuted} />
              ) : (
                <AppText variant="caption" tone="muted">
                  That’s every problem{filtered ? ' that matches' : ''}.
                </AppText>
              )}
            </View>
          )
        }
        contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
        onScroll={(event) => {
          const past = event.nativeEvent.contentOffset.y > 48;
          if (past !== scrolled) setScrolled(past);
        }}
        scrollEventThrottle={32}
        onEndReachedThreshold={1.5}
        onEndReached={() => void list.loadMore()}
        refreshControl={
          selection || downloaded ? (
            <RefreshControl refreshing={false} onRefresh={() => void list.refresh()} />
          ) : undefined
        }
      />
      {/* Keeps the clock and battery readable over the list as it scrolls under them. */}
      <View
        pointerEvents="none"
        style={[
          styles.statusScrim,
          { height: insets.top, backgroundColor: colors.background, opacity: scrolled ? 0.94 : 0 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  /** What a pull-down reveals above the band: its own colour, not the page. */
  overscroll: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  header: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  band: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    marginBottom: -spacing.lg,
  },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  barEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barStart: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  searchBox: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  search: { flex: 1, minHeight: touchTarget, fontSize: 16 },
  content: { flexGrow: 1, paddingBottom: spacing.xxl },
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  centered: { textAlign: 'center' },
  start: { alignItems: 'stretch', width: '100%', maxWidth: 480, alignSelf: 'center' },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  footer: { height: 72, alignItems: 'center', justifyContent: 'center' },
});
