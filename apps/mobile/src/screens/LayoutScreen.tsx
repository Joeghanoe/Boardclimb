import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection, DirectoryEntry } from '@boardclimb/application';
import {
  AppText,
  BLOCKS,
  GradientBackdrop,
  Icon,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import type { AppContainer } from '../composition/AppContainer';
import { ConfigurationSheet } from './ConfigurationSheet';
import { ModeBanner } from './ModeBanner';
import { ScreenFrame } from './ScreenFrame';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeManufacturer } from './presentation/describeManufacturer';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface LayoutScreenProps {
  container: AppContainer;
  current: BoardSelection | null;
  onChoose: (selection: BoardSelection) => void;
  onBack: () => void;
}

/**
 * Board-first route: pick a manufacturer's board and layout.
 * Choosing a board model only configures the catalog and never selects a physical controller (FR-001, FR-003, FR-004).
 * One manufacturer failing never hides the others.
 */
export function LayoutScreen({ container, current, onChoose, onBack }: LayoutScreenProps) {
  const { colors } = useTheme();
  const [boardKey, setBoardKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    container.directory.list().then((listed) => {
      if (!cancelled) setEntries(listed);
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  const openBoard = entries
    ?.flatMap((entry) =>
      entry.ok
        ? entry.boards.map((item) => ({ key: `${entry.manufacturer}-${item.board.id}`, ...item }))
        : [],
    )
    .find((item) => item.key === boardKey);

  return (
    <ScreenFrame title="Choose your board" eyebrow="Board layout" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModeBanner mode={container.mode} persistent={container.persistent} />

        {entries === null ? (
          <View style={styles.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.text} />
            <AppText variant="caption" tone="muted">
              Loading board catalogs…
            </AppText>
          </View>
        ) : null}

        {entries?.map((entry) => {
          const blocks = manufacturerBlocks(entry.manufacturer);
          return (
            <View key={entry.manufacturer} style={styles.block}>
              <GradientBackdrop from={BLOCKS[blocks.from].bg} to={BLOCKS[blocks.to].bg} />
              <View style={styles.blockHead}>
                <AppText variant="display" style={styles.ink} accessibilityRole="header" aria-level={2}>
                  {describeManufacturer(entry.manufacturer)}
                </AppText>
                <View style={styles.countTag}>
                  <AppText variant="caption" style={[styles.ink, styles.countText]}>
                    {entry.ok
                      ? `${entry.boards.length} ${entry.boards.length === 1 ? 'board' : 'boards'}`
                      : 'Offline'}
                  </AppText>
                </View>
              </View>

              {entry.ok ? (
                entry.boards.map(({ board, configurations }) => {
                  const key = `${entry.manufacturer}-${board.id}`;
                  const isCurrentBoard =
                    current?.configuration.manufacturer === board.manufacturer &&
                    current?.boardName === board.name;
                  return (
                    <View key={board.id} style={styles.board}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${board.name}, ${configurations.length} layouts${isCurrentBoard ? ', current board' : ''}`}
                        accessibilityHint="Opens the layout and angle choices"
                        onPress={() => setBoardKey(key)}
                        style={({ pressed }) => [styles.boardRow, pressed && styles.pressed]}
                      >
                        <View style={styles.boardInfo}>
                          <AppText variant="label" style={[styles.boardName, styles.ink]}>
                            {board.name}
                          </AppText>
                          <AppText variant="caption" style={[styles.ink, styles.soft]}>
                            {isCurrentBoard ? 'Current board · ' : ''}
                            {configurations.length} {configurations.length === 1 ? 'layout' : 'layouts'}
                          </AppText>
                        </View>
                        <View style={[styles.arrow, { backgroundColor: '#151618' }]}>
                          <Icon name="arrowUpRight" color="#FFFFFF" size={16} weight={2.6} />
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.board, { backgroundColor: colors.surface }]}>
                  <View style={styles.boardRow}>
                    <View style={styles.boardInfo}>
                      <AppText variant="label">{describeCatalogError(entry.code).title}</AppText>
                      <AppText variant="caption" tone="muted">
                        {describeCatalogError(entry.code).action}
                      </AppText>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <ConfigurationSheet
        visible={openBoard !== undefined}
        title={openBoard?.board.name ?? ''}
        configurations={openBoard?.configurations ?? []}
        selectedId={
          openBoard && current?.configuration.manufacturer === openBoard.board.manufacturer
            ? current.configuration.id
            : null
        }
        onChoose={(configuration) => {
          if (openBoard) onChoose({ boardName: openBoard.board.name, configuration });
        }}
        onClose={() => setBoardKey(null)}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  block: { borderRadius: radii.xl, overflow: 'hidden', padding: spacing.md, gap: spacing.sm },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  countTag: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  countText: { fontWeight: '700' },
  ink: { color: '#151618' },
  soft: { opacity: 0.75 },
  board: { borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.45)', overflow: 'hidden' },
  boardRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  boardInfo: { flex: 1, gap: 2 },
  boardName: { fontSize: 16 },
  arrow: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
