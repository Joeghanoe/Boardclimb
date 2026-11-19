import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection, DirectoryEntry } from '@boardclimb/application';
import {
  AppText,
  BLOCKS,
  Button,
  GradientBackdrop,
  radii,
  spacing,
  useTheme,
} from '@boardclimb/design-system';
import type { Manufacturer } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { AngleStrip } from './AngleStrip';
import { ModeBanner } from './ModeBanner';
import { PickerPill } from './PickerPill';
import { ScreenFrame } from './ScreenFrame';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeManufacturer } from './presentation/describeManufacturer';
import { groupConfigurations } from './presentation/groupConfigurations';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';
import { DEFAULT_ANGLE, pickConfiguration } from './presentation/pickConfiguration';

interface LayoutScreenProps {
  container: AppContainer;
  current: BoardSelection | null;
  onChoose: (selection: BoardSelection) => void;
  onBack: () => void;
}

/**
 * Board-first route: pick a manufacturer, its board, the layout and size, then the wall angle, all on one
 * screen. The colour behind the screen is the chosen manufacturer's, and the chosen pills wear it.
 * Choosing a board model only configures the catalog and never selects a physical controller (FR-001, FR-003, FR-004).
 * One manufacturer failing never hides the others.
 */
export function LayoutScreen({ container, current, onChoose, onBack }: LayoutScreenProps) {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(
    current?.configuration.manufacturer ?? null,
  );
  const [boardId, setBoardId] = useState<string | null>(current?.configuration.boardId ?? null);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [angle, setAngle] = useState<number | null>(current?.configuration.angleDegrees ?? DEFAULT_ANGLE);

  useEffect(() => {
    let cancelled = false;
    container.directory.list().then((listed) => {
      if (!cancelled) setEntries(listed);
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  const entry = entries?.find((item) => item.manufacturer === manufacturer) ?? entries?.[0];
  const active: Manufacturer = entry?.manufacturer ?? manufacturer ?? 'kilter';
  const boards = entry?.ok ? entry.boards : [];
  const board = boards.find((item) => item.board.id === boardId) ?? boards[0];
  const groups = useMemo(() => groupConfigurations(board?.configurations ?? []), [board]);
  const group =
    groups.find((item) => item.key === groupKey) ??
    groups.find((item) => item.configurations.some((c) => c.id === current?.configuration.id)) ??
    groups[0];
  const selected = pickConfiguration(group?.configurations ?? [], angle);
  const blocks = manufacturerBlocks(active);
  const accent = blocks.from;
  const manufacturerPrefix = describeManufacturer(active) + ' ';
  const shortBoardLabels = boards.every((item) => item.board.name.startsWith(manufacturerPrefix));
  const boardPrefix = board ? board.board.name + ' · ' : '';
  const shortLayoutLabels = boardPrefix !== '' && groups.every((item) => item.label.startsWith(boardPrefix));

  return (
    <ScreenFrame
      title="Choose your board"
      eyebrow="Board layout"
      titleVariant="title"
      onBack={onBack}
      backdrop={
        <GradientBackdrop
          from={BLOCKS[blocks.from].bg}
          to={BLOCKS[blocks.to].bg}
          glow={false}
          fadeTo={colors.background}
          style={styles.glow}
        />
      }
    >
      <View style={styles.body}>
        <ScrollView style={styles.body} contentContainerStyle={styles.content}>
          <ModeBanner mode={container.mode} persistent={container.persistent} />

          {entries === null ? (
            <View style={styles.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.text} />
              <AppText variant="caption" tone="muted">
                Loading board catalogs…
              </AppText>
            </View>
          ) : (
            <>
              <View role="group" accessibilityLabel="Manufacturer" style={styles.row}>
                {entries.map((item) => (
                  <PickerPill
                    key={item.manufacturer}
                    label={describeManufacturer(item.manufacturer)}
                    selected={item.manufacturer === active}
                    block={manufacturerBlocks(item.manufacturer).from}
                    onPress={() => {
                      setManufacturer(item.manufacturer);
                      setBoardId(null);
                      setGroupKey(null);
                    }}
                    style={styles.manufacturer}
                  />
                ))}
              </View>

              {entry && !entry.ok ? (
                <View style={styles.section}>
                  <AppText variant="bodyStrong">{describeCatalogError(entry.code).title}</AppText>
                  <AppText tone="muted">{describeCatalogError(entry.code).action}</AppText>
                </View>
              ) : null}

              {boards.length > 1 ? (
                <View style={styles.section}>
                  <AppText variant="eyebrow" tone="muted">
                    Board
                  </AppText>
                  <View style={styles.wrap}>
                    {boards.map((item) => (
                      <PickerPill
                        key={item.board.id}
                        label={
                          shortBoardLabels
                            ? item.board.name.slice(manufacturerPrefix.length)
                            : item.board.name
                        }
                        accessibilityLabel={item.board.name}
                        selected={item.board.id === board?.board.id}
                        block={accent}
                        onPress={() => {
                          setBoardId(item.board.id);
                          setGroupKey(null);
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {groups.length > 1 ? (
                <View style={styles.section}>
                  <AppText variant="eyebrow" tone="muted">
                    Layout
                  </AppText>
                  <View style={styles.wrap}>
                    {groups.map((item) => (
                      <PickerPill
                        key={item.key}
                        label={shortLayoutLabels ? item.label.slice(boardPrefix.length) : item.label}
                        accessibilityLabel={item.label}
                        selected={item.key === group?.key}
                        block={accent}
                        onPress={() => setGroupKey(item.key)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {/* Pinned, so the angle and the way forward are always in the same place under the thumb. */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <View style={styles.angleHead}>
            <AppText variant="eyebrow" tone="muted">
              Wall angle
            </AppText>
            <AppText
              variant="label"
              accessibilityLabel={
                selected && selected.angleDegrees !== null ? `${selected.angleDegrees} degrees` : undefined
              }
            >
              {selected ? (selected.angleDegrees === null ? 'Fixed' : `${selected.angleDegrees}°`) : '–'}
            </AppText>
          </View>
          <AngleStrip
            configurations={group?.configurations ?? []}
            selectedId={selected?.id ?? null}
            block={accent}
            onSelect={(configuration) => setAngle(configuration.angleDegrees)}
          />
          <View style={styles.action}>
            <Button
              label="Show problems"
              variant="primary"
              disabled={!board || !selected}
              onPress={() => {
                if (board && selected) onChoose({ boardName: board.board.name, configuration: selected });
              }}
            />
          </View>
        </View>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 'auto', height: 340, opacity: 0.24 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.sm },
  manufacturer: { flex: 1, paddingHorizontal: spacing.sm },
  section: { gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  angleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  action: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
