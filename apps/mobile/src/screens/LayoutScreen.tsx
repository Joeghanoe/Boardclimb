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
import { ConfigurationChooser } from './ConfigurationChooser';
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
                  const isExpanded = boardKey === key;
                  const isCurrentBoard =
                    current?.configuration.manufacturer === board.manufacturer &&
                    current?.boardName === board.name;
                  return (
                    <View
                      key={board.id}
                      style={[styles.board, isExpanded && { backgroundColor: colors.surface }]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${board.name}, ${configurations.length} layouts${isCurrentBoard ? ', current board' : ''}`}
                        accessibilityState={{ expanded: isExpanded }}
                        onPress={() => setBoardKey(isExpanded ? null : key)}
                        style={({ pressed }) => [styles.boardRow, pressed && styles.pressed]}
                      >
                        <View style={styles.boardInfo}>
                          <AppText
                            variant="label"
                            style={[styles.boardName, isExpanded ? { color: colors.text } : styles.ink]}
                          >
                            {board.name}
                          </AppText>
                          <AppText
                            variant="caption"
                            style={isExpanded ? { color: colors.textMuted } : [styles.ink, styles.soft]}
                          >
                            {isCurrentBoard ? 'Current board · ' : ''}
                            {configurations.length} {configurations.length === 1 ? 'layout' : 'layouts'}
                          </AppText>
                        </View>
                        <View
                          style={[
                            styles.arrow,
                            { backgroundColor: isExpanded ? colors.surfaceMuted : '#151618' },
                          ]}
                        >
                          <Icon
                            name={isExpanded ? 'chevronDown' : 'arrowUpRight'}
                            color={isExpanded ? colors.text : '#FFFFFF'}
                            size={16}
                            weight={2.6}
                          />
                        </View>
                      </Pressable>
                      {isExpanded ? (
                        <ConfigurationChooser
                          configurations={configurations}
                          selectedId={
                            current?.configuration.manufacturer === board.manufacturer
                              ? current.configuration.id
                              : null
                          }
                          onChoose={(configuration) => onChoose({ boardName: board.name, configuration })}
                        />
                      ) : null}
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
