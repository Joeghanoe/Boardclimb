import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  BLOCKS,
  Button,
  GradientBackdrop,
  Icon,
  Notice,
  SegmentedControl,
  radii,
  shadows,
  spacing,
  useTheme,
} from '@boardclimb/design-system';
import { defaultProblemFilters } from '@boardclimb/domain';
import type { GradeSystem, ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { ConnectionChip } from './ConnectionChip';
import { FilterBar } from './FilterBar';
import { ModeBanner } from './ModeBanner';
import type { BrowsedList } from './BrowsedList';
import { ProblemRow } from './ProblemRow';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeManufacturer } from './presentation/describeManufacturer';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';
import { useBoardSnapshot } from './useBoardSnapshot';
import { useConfigurationLabels } from './useConfigurationLabels';
import { useProblemList } from './useProblemList';

interface ProblemListScreenProps {
  container: AppContainer;
  active: boolean;
  downloaded: boolean;
  search: string;
  onChangeDownloaded: (value: boolean) => void;
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
}

/** Browsing: cached problems first, refreshed in the background. Opening or filtering never touches the board (FR-008). */
export function ProblemListScreen({
  container,
  active,
  downloaded,
  search,
  onChangeDownloaded: setDownloaded,
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
}: ProblemListScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const labels = useConfigurationLabels(container.directory);
  const [openFailed, setOpenFailed] = useState(false);
  const list = useProblemList(
    container.browser,
    downloaded ? null : selection,
    filters,
    downloaded ? search : '',
  );
  const snapshot = useBoardSnapshot(container.session);
  useEffect(() => {
    onListChange({ items: list.items, hasMore: list.hasMore, loadMore: list.loadMore });
  }, [onListChange, list.items, list.hasMore, list.loadMore]);
  const filtered = filters.minDifficulty !== null || filters.maxDifficulty !== null || filters.minStars > 0;
  const notice = list.notice ? describeCatalogError(list.notice) : null;

  const blocks = manufacturerBlocks(selection && !downloaded ? selection.configuration.manufacturer : null);
  const angle = selection?.configuration.angleDegrees ?? null;

  const header = (
    <View style={styles.header}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <GradientBackdrop from={BLOCKS[blocks.from].bg} to={BLOCKS[blocks.to].bg} />
        <View style={styles.heroTop}>
          <AppText variant="eyebrow" style={styles.ink}>
            BoardClimb
          </AppText>
          <ConnectionChip snapshot={snapshot} onPress={onOpenBoard} surface="glass" />
        </View>
        {selection && !downloaded ? (
          <View style={styles.heroBody}>
            <AppText variant="eyebrow" style={styles.ink}>
              {describeManufacturer(selection.configuration.manufacturer)}
            </AppText>
            <AppText variant="hero" style={styles.ink} numberOfLines={3} accessibilityRole="header">
              {selection.boardName}
            </AppText>
            <View style={styles.heroFoot}>
              <View style={styles.facts}>
                <View style={styles.fact}>
                  <AppText variant="caption" style={[styles.ink, styles.factText]} numberOfLines={1}>
                    {selection.configuration.name}
                  </AppText>
                </View>
                {angle === null ? null : (
                  <View style={styles.fact}>
                    <AppText variant="caption" style={[styles.ink, styles.factText]}>
                      {angle}°
                    </AppText>
                  </View>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change board layout"
                onPress={onChooseLayout}
                style={({ pressed }) => [styles.change, pressed && { opacity: 0.8 }]}
              >
                <AppText variant="label" style={styles.ink}>
                  Change
                </AppText>
                <View style={styles.changeArrow}>
                  <Icon name="arrowUpRight" color="#FFFFFF" size={16} weight={2.6} />
                </View>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.heroBody}>
            <AppText variant="hero" style={styles.ink} accessibilityRole="header">
              {downloaded ? 'Downloaded' : 'Find your problem'}
            </AppText>
            <AppText style={[styles.ink, styles.heroLead]}>
              {downloaded
                ? 'Every layout you have browsed on this phone.'
                : 'Choose the board at your gym to start.'}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.floating}>
        <SegmentedControl
          accessibilityLabel="Which problems to show"
          options={[
            { value: 'board', label: 'This board' },
            { value: 'downloaded', label: 'Downloaded' },
          ]}
          value={downloaded ? 'downloaded' : 'board'}
          onChange={(next) => {
            setDownloaded(next === 'downloaded');
            if (next === 'board' && !selection) onOpenBoard();
          }}
        />
      </View>

      <View style={styles.section}>
        <ModeBanner mode={container.mode} persistent={container.persistent} />
        {downloaded ? (
          <View style={[styles.searchBox, { backgroundColor: colors.surface }, shadows.soft]}>
            <Icon name="search" color={colors.textMuted} size={18} />
            <TextInput
              accessibilityLabel="Search downloaded problems"
              value={search}
              onChangeText={setSearch}
              placeholder="Search downloaded problems"
              placeholderTextColor={colors.textMuted}
              style={[styles.search, { color: colors.text }]}
            />
          </View>
        ) : null}
        {openFailed ? (
          <Notice
            tone="error"
            title="Could not open that layout"
            message="Choose the problem’s board layout and try again."
          />
        ) : null}
        {selection || downloaded ? (
          <FilterBar
            title="Problems"
            filters={filters}
            onChange={onChangeFilters}
            gradeScale={gradeScale}
            onChangeGradeScale={onChangeGradeScale}
          />
        ) : null}
        {notice && list.items.length > 0 ? <Notice title={notice.title} message={notice.action} /> : null}
      </View>
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
          {container.mode === 'live' ? (
            <AppText tone="muted" variant="caption" style={styles.centered}>
              The first catalog download can be large. Keep the app open on Wi-Fi.
            </AppText>
          ) : null}
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
    if (!selection) {
      return (
        <View style={styles.empty}>
          <AppText variant="title" style={styles.centered}>
            Choose your board layout to see problems
          </AppText>
          <Button label="Find my board" variant="primary" large onPress={onOpenBoard} />
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
      <View pointerEvents="none" style={[styles.overscroll, { backgroundColor: BLOCKS[blocks.from].bg }]} />
      <FlatList
        data={list.items}
        keyExtractor={(problem) => problem.key}
        renderItem={({ item, index }) => (
          <ProblemRow
            problem={item}
            first={index === 0}
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
        onEndReachedThreshold={1.5}
        onEndReached={() => void list.loadMore()}
        refreshControl={
          selection || downloaded ? (
            <RefreshControl refreshing={false} onRefresh={() => void list.refresh()} />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  /** What a pull-down reveals above the hero: its own colour, not the page. */
  overscroll: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  header: { marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  hero: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
    borderBottomLeftRadius: radii.xl + 6,
    borderBottomRightRadius: radii.xl + 6,
    overflow: 'hidden',
    gap: spacing.xl,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroBody: { gap: spacing.sm },
  heroLead: { maxWidth: 280, opacity: 0.8 },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, flexShrink: 1 },
  fact: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  factText: { fontWeight: '700' },
  ink: { color: '#151618' },
  change: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  changeArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#151618',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: { marginTop: -(spacing.xl + 4), marginHorizontal: spacing.sm },
  section: { gap: spacing.lg, marginTop: spacing.xl },
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
  search: { flex: 1, minHeight: 50, fontSize: 16 },
  content: { flexGrow: 1, paddingBottom: spacing.xxl + spacing.xl },
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  centered: { textAlign: 'center' },
  footer: { height: 72, alignItems: 'center', justifyContent: 'center' },
});
