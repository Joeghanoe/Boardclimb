import { useState } from 'react';
import { ActivityIndicator, TextInput, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
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
  onOpenProblem: (problem: ProblemSummary) => Promise<void>;
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
  onOpenProblem,
  onChooseLayout,
  onOpenBoard,
}: ProblemListScreenProps) {
  const { colors } = useTheme();
  const labels = useConfigurationLabels(container.directory);
  const [openFailed, setOpenFailed] = useState(false);
  const list = useProblemList(
    container.browser,
    downloaded ? null : selection,
    filters,
    downloaded ? search : '',
  );
  const snapshot = useBoardSnapshot(container.session);
  const filtered = filters.minDifficulty !== null || filters.maxDifficulty !== null || filters.minStars > 0;
  const notice = list.notice ? describeCatalogError(list.notice) : null;

  const header = (
    <View style={styles.header}>
      <ModeBanner mode={container.mode} persistent={container.persistent} />
      <View style={styles.modes}>
        <Button
          label="Board problems"
          selected={!downloaded}
          variant={!downloaded ? 'primary' : 'secondary'}
          onPress={() => {
            setDownloaded(false);
            if (!selection) onChooseLayout();
          }}
        />
        <Button
          label="Downloaded"
          selected={downloaded}
          variant={downloaded ? 'primary' : 'secondary'}
          onPress={() => setDownloaded(true)}
        />
      </View>
      {downloaded ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Search downloaded problems</AppText>
          <TextInput
            accessibilityLabel="Search downloaded problems"
            value={search}
            onChangeText={setSearch}
            placeholder="Problem name"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.search,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.controlBorder },
            ]}
          />
          <AppText tone="muted" variant="caption">
            All layouts you have browsed on this phone.
          </AppText>
          <Button label="Download another layout" onPress={onChooseLayout} />
        </View>
      ) : null}
      {openFailed ? (
        <Notice
          tone="error"
          title="Could not open that layout"
          message="Choose the problem’s board layout and try again."
        />
      ) : null}
      {selection && !downloaded ? (
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
      {selection || downloaded ? <FilterBar filters={filters} onChange={onChangeFilters} /> : null}
      {notice ? <Notice title={notice.title} message={notice.action} /> : null}
    </View>
  );

  const empty = (() => {
    if (list.loading) {
      return (
        <View style={styles.empty} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText tone="muted">Loading problems…</AppText>
          {container.mode === 'live' ? (
            <AppText tone="muted" variant="caption" style={styles.centered}>
              The first catalog download can be large. Keep the app open on Wi-Fi.
            </AppText>
          ) : null}
        </View>
      );
    }
    if (downloaded) {
      return (
        <View style={styles.empty}>
          <AppText variant="title">
            {search || filtered ? 'No downloaded problems match' : 'No downloaded problems yet'}
          </AppText>
          {search ? <Button label="Clear search" onPress={() => setSearch('')} /> : null}
          {filtered ? (
            <Button label="Clear filters" onPress={() => onChangeFilters(defaultProblemFilters)} />
          ) : null}
          <Button label="Choose a board layout" onPress={onChooseLayout} />
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
    <ScreenFrame
      active={active}
      title="Problems"
      headerRight={<ConnectionChip snapshot={snapshot} onPress={onOpenBoard} />}
    >
      <FlatList
        data={list.items}
        keyExtractor={(problem) => problem.key}
        renderItem={({ item }) => (
          <ProblemRow
            problem={item}
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
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} /> : undefined}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.content}
        onEndReachedThreshold={0.5}
        onEndReached={() => void list.loadMore()}
        refreshControl={
          selection || downloaded ? (
            <RefreshControl refreshing={false} onRefresh={() => void list.refresh()} />
          ) : undefined
        }
      />
    </ScreenFrame>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: spacing.md, fontSize: 16 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  board: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  boardName: { flexShrink: 1 },
  empty: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl },
  centered: { textAlign: 'center' },
  separator: { height: spacing.sm },
});
