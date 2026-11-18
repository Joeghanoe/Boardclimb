import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type {
  BoardErrorCode,
  BoardSelection,
  DirectoryEntry,
  DiscoveredBoard,
} from '@boardclimb/application';
import {
  AppText,
  Button,
  Card,
  Notice,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { ConfigurationSheet } from './ConfigurationSheet';
import { ModeBanner } from './ModeBanner';
import { ScreenFrame } from './ScreenFrame';
import { describeBoardError } from './presentation/describeBoardError';
import { describeConfiguration } from './presentation/describeConfiguration';
import { describeManufacturer } from './presentation/describeManufacturer';
import { useBoardSnapshot } from './useBoardSnapshot';

interface BoardScreenProps {
  container: AppContainer;
  selection: BoardSelection | null;
  onBack: () => void;
  onOpenDiagnostics: () => void;
  onChooseLayout: () => void;
  onUseLayout: (selection: BoardSelection) => void;
}

type Scan =
  | { state: 'idle' }
  | { state: 'scanning' }
  | { state: 'done'; boards: DiscoveredBoard[] }
  | { state: 'failed'; code: BoardErrorCode };

/**
 * Connect a physical board controller.
 * Opening Boards scans nearby. The climber chooses the board and confirms its layout.
 * Connecting never auto-lights LEDs and never connects automatically (FR-002, FR-003, FR-011, FR-017).
 */
export function BoardScreen({
  container,
  selection,
  onBack,
  onOpenDiagnostics,
  onChooseLayout,
  onUseLayout,
}: BoardScreenProps) {
  const { colors } = useTheme();
  const scanEpoch = useRef(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const [editingLayout, setEditingLayout] = useState(false);
  const snapshot = useBoardSnapshot(container.session);
  const [scan, setScan] = useState<Scan>({ state: 'idle' });
  const [choosing, setChoosing] = useState<DiscoveredBoard | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const entry = entries?.find((candidate) => candidate.manufacturer === choosing?.manufacturer);
  const boards = entry?.ok ? entry.boards : [];
  const layouts = boards.flatMap((board) => board.configurations);

  useEffect(() => {
    let cancelled = false;
    void container.directory.list().then((listed) => {
      if (!cancelled) setEntries(listed);
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  useEffect(() => {
    if (choosing) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [choosing]);

  const search = useCallback(async () => {
    const epoch = ++scanEpoch.current;
    setChoosing(null);
    setScan({ state: 'scanning' });
    const results = await Promise.all(
      MANUFACTURERS.map((manufacturer) => container.session.discover(manufacturer)),
    );
    if (epoch !== scanEpoch.current) return;
    const found = results
      .flatMap((result) => (result.ok ? result.boards : []))
      .sort((a, b) => (b.rssi ?? -Infinity) - (a.rssi ?? -Infinity));
    const failure = results.find((result) => !result.ok);
    setScan(
      found.length === 0 && failure
        ? { state: 'failed', code: failure.code }
        : { state: 'done', boards: found },
    );
  }, [container]);

  useEffect(() => {
    const connection = container.session.snapshot().connection;
    if (connection === 'idle' || connection === 'failed') void search();
    return () => {
      scanEpoch.current += 1;
    };
  }, [container, search]);

  const pick = (board: DiscoveredBoard) => {
    setChoosing(board);
    setLayoutId(null);
    setEditingLayout(false);
  };

  const suggestedId =
    layouts.find((layout) => layout.id === choosing?.detectedConfigurationId)?.id ??
    (snapshot.board?.id === choosing?.id ? snapshot.configuration?.id : null) ??
    (selection?.configuration.manufacturer === choosing?.manufacturer ? selection?.configuration.id : null);
  const selectedLayout = layouts.find((layout) => layout.id === (layoutId ?? suggestedId));

  const connect = () => {
    if (!choosing || !selectedLayout) return;
    const board = boards.find(({ configurations }) => configurations.includes(selectedLayout));
    if (!board) return;
    onUseLayout({ boardName: board.board.name, configuration: selectedLayout });
    void container.session.connect(choosing, selectedLayout);
    setChoosing(null);
  };

  const failure = scan.state === 'failed' ? describeBoardError(scan.code) : null;
  const discovered = scan.state === 'done' ? scan.boards : [];
  const duplicateNames = new Set(
    discovered
      .filter((board, index) => discovered.findIndex((other) => other.name === board.name) !== index)
      .map((board) => board.name),
  );
  const boardLabel = (board: DiscoveredBoard) => {
    const name = board.name ?? 'Unnamed board';
    return duplicateNames.has(board.name) ? `${name} · ${board.id.slice(-4)}` : name;
  };
  const connectionError = snapshot.error ? describeBoardError(snapshot.error.code) : null;
  const connected = snapshot.connection === 'connected';

  const connectionTone = connected
    ? colors.connected
    : snapshot.connection === 'connecting'
      ? colors.connecting
      : snapshot.connection === 'lost'
        ? colors.danger
        : colors.disconnected;

  const connectionLabel = connected
    ? 'CONNECTED'
    : snapshot.connection === 'connecting'
      ? 'CONNECTING...'
      : snapshot.connection === 'lost'
        ? 'CONNECTION LOST'
        : 'NOT CONNECTED';

  return (
    <ScreenFrame title="Board connection" onBack={onBack}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <ModeBanner mode={container.mode} persistent={container.persistent} />

        {/* CONTROLLER STATUS HERO SURFACE */}
        <Card
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: connected ? colors.connected : colors.divider,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.badge}>
              <View style={[styles.statusDot, { backgroundColor: connectionTone }]} />
              <AppText variant="caption" style={[styles.badgeText, { color: colors.text }]}>
                {connectionLabel}
              </AppText>
            </View>
            {snapshot.board ? (
              <View style={styles.badge}>
                <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
                  {describeManufacturer(snapshot.board.manufacturer)}
                </AppText>
              </View>
            ) : null}
          </View>

          {connected && snapshot.board ? (
            <View style={styles.controllerDetail}>
              <AppText variant="display" style={[styles.boldTitle, { color: colors.text }]}>
                {snapshot.board.name ?? 'Board Controller'}
              </AppText>
              {snapshot.configuration ? (
                <AppText variant="bodyStrong" style={{ color: colors.accent }}>
                  {describeConfiguration(snapshot.configuration)}
                </AppText>
              ) : null}
              <AppText variant="caption" tone="muted">
                Open a problem and tap Light up.
              </AppText>
            </View>
          ) : snapshot.connection === 'connecting' ? (
            <View style={styles.controllerDetail}>
              <AppText variant="title" style={styles.boldTitle}>
                Connecting to controller...
              </AppText>
              <AppText variant="caption" tone="muted">
                Establishing Bluetooth link with the wall.
              </AppText>
            </View>
          ) : snapshot.connection === 'lost' ? (
            <View style={styles.controllerDetail}>
              <AppText variant="title" style={[styles.boldTitle, { color: colors.danger }]}>
                Bluetooth connection lost
              </AppText>
              <AppText variant="caption" tone="muted">
                The link to the wall controller dropped. Stand near the wall and tap Reconnect.
              </AppText>
            </View>
          ) : (
            <View style={styles.controllerDetail}>
              <AppText variant="title" style={styles.boldTitle}>
                Find your wall’s controller
              </AppText>
              <AppText variant="caption" tone="muted">
                Scan and choose the controller at your wall.
              </AppText>
            </View>
          )}

          {connectionError ? (
            <Notice tone="error" title={connectionError.title} message={connectionError.action} />
          ) : null}

          {snapshot.connection === 'lost' ? (
            <Button
              label="Reconnect"
              variant="primary"
              large
              onPress={() => void container.session.reconnect()}
            />
          ) : null}

          {connected && snapshot.board && !choosing ? (
            <Button
              label="Change wall layout"
              onPress={() => {
                if (snapshot.board) pick(snapshot.board);
                setEditingLayout(true);
              }}
            />
          ) : null}

          {connected || snapshot.connection === 'lost' || snapshot.connection === 'connecting' ? (
            <Button
              label={snapshot.connection === 'connecting' ? 'Cancel connection' : 'Disconnect'}
              onPress={() => void container.session.disconnect()}
            />
          ) : null}
        </Card>

        {/* HARDWARE CONFIRMATION PANEL */}
        {choosing ? (
          <Card
            style={[styles.choosingCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.badge}>
                <AppText variant="caption" style={[styles.badgeText, { color: colors.textMuted }]}>
                  CONTROLLER & LAYOUT
                </AppText>
              </View>
            </View>

            <View style={styles.controllerDetail}>
              <AppText variant="title" accessibilityRole="header" aria-level={2} style={styles.boldTitle}>
                Connect to {boardLabel(choosing)}
              </AppText>
              <View style={styles.hardwareSpecs}>
                <AppText variant="caption" tone="muted">
                  Brand: {describeManufacturer(choosing.manufacturer)}
                </AppText>
                {selectedLayout && selectedLayout.id === choosing.detectedConfigurationId ? (
                  <AppText variant="caption" style={{ color: colors.accent, fontWeight: '700' }}>
                    Layout auto-detected
                  </AppText>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.layoutSummaryBox,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.divider },
              ]}
            >
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '800' }}>
                TARGET WALL LAYOUT
              </AppText>
              {selectedLayout ? (
                <AppText variant="bodyStrong" style={[styles.boldTitle, { color: colors.text }]}>
                  {describeConfiguration(selectedLayout)}
                </AppText>
              ) : (
                <AppText tone="muted">
                  {entries === null
                    ? 'Loading layouts…'
                    : entry && !entry.ok
                      ? 'Layouts are unavailable. Go back and try again.'
                      : 'Choose the layout and angle. The controller did not identify the wall layout.'}
                </AppText>
              )}
            </View>

            <Button
              label="Connect controller"
              variant="primary"
              large
              disabled={!selectedLayout}
              onPress={connect}
            />

            <Button
              label={selectedLayout ? 'Change layout' : 'Choose layout'}
              disabled={layouts.length === 0}
              onPress={() => setEditingLayout(true)}
            />

            <ConfigurationSheet
              visible={editingLayout}
              title={describeManufacturer(choosing.manufacturer)}
              configurations={layouts}
              selectedId={selectedLayout?.id ?? null}
              onChoose={(configuration) => {
                setLayoutId(configuration.id);
                setEditingLayout(false);
              }}
              onClose={() => setEditingLayout(false)}
            />

            <Button label="Cancel selection" onPress={() => setChoosing(null)} />
          </Card>
        ) : null}

        {/* SCAN & DISCOVER CONTROLLERS */}
        <Card style={[styles.discoveryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badge}>
              <AppText variant="caption" style={[styles.badgeText, { color: colors.textMuted }]}>
                NEARBY CONTROLLERS
              </AppText>
            </View>
          </View>

          <View style={styles.sectionTitles}>
            <AppText variant="title" accessibilityRole="header" aria-level={2} style={styles.boldTitle}>
              Find controllers
            </AppText>
          </View>

          <Button
            label={scan.state === 'scanning' ? 'Scanning nearby boards...' : 'Scan for controllers'}
            variant="primary"
            large
            busy={scan.state === 'scanning'}
            onPress={() => void search()}
          />

          {failure ? <Notice tone="error" title={failure.title} message={failure.action} /> : null}

          {scan.state === 'done' && scan.boards.length === 0 ? (
            <Notice
              title={describeBoardError('board_not_found').title}
              message={describeBoardError('board_not_found').action}
            />
          ) : null}

          {discovered.length > 0 ? (
            <View style={styles.discoveredList}>
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '800' }}>
                NEARBY BOARDS
              </AppText>
              {duplicateNames.size > 0 ? (
                <AppText variant="caption" tone="muted">
                  Some boards share a name. Move close to your wall and scan again. Stronger signals appear
                  first.
                </AppText>
              ) : null}
              {discovered.map((board) => (
                <Pressable
                  key={`${board.manufacturer}/${board.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${boardLabel(board)}`}
                  accessibilityHint="Choose this controller to pair"
                  onPress={() => pick(board)}
                  style={({ pressed }) => [
                    styles.discoveredItem,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.controlBorder,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.discoveredInfo}>
                    <AppText variant="bodyStrong" style={styles.boldTitle}>
                      {boardLabel(board)}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {describeManufacturer(board.manufacturer)} controller
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.selectBadge,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 12 }}
                    >
                      SELECT
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>

        <Button label="Browse without connecting" onPress={onChooseLayout} />

        {/* DIAGNOSTICS NAVIGATION FOOTER */}
        <Card style={[styles.diagnosticsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.diagnosticsInfo}>
            <AppText variant="bodyStrong" style={styles.boldTitle}>
              Diagnostics & Privacy
            </AppText>
            <AppText variant="caption" tone="muted">
              View connection errors.
            </AppText>
          </View>
          <Button label="Open diagnostics" onPress={onOpenDiagnostics} />
        </Card>
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controllerDetail: {
    gap: spacing.xs,
  },
  boldTitle: {
    fontWeight: '800',
  },
  choosingCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  hardwareSpecs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  layoutSummaryBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  discoveryCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitles: {
    gap: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  discoveredList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  discoveredItem: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  discoveredInfo: {
    flex: 1,
    gap: 2,
  },
  selectBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagnosticsCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  diagnosticsInfo: {
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
