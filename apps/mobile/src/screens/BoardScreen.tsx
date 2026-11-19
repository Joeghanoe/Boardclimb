import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  BoardErrorCode,
  BoardSelection,
  DirectoryEntry,
  DiscoveredBoard,
} from '@boardclimb/application';
import {
  AppText,
  Button,
  Icon,
  IconButton,
  Notice,
  radii,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { BoardPicker } from './BoardPicker';
import { ManufacturerMark } from './ManufacturerMark';
import { ScanPulse } from './ScanPulse';
import { ConfigurationSheet } from './ConfigurationSheet';
import { ModeBanner } from './ModeBanner';
import { describeBoardError } from './presentation/describeBoardError';
import { describeConfiguration } from './presentation/describeConfiguration';
import { describeManufacturer } from './presentation/describeManufacturer';
import { useBoardSnapshot } from './useBoardSnapshot';

interface BoardScreenProps {
  container: AppContainer;
  selection: BoardSelection | null;
  /** The gym the climber came from on the map, shown in the top bar. */
  gymName?: string;
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
 * Connect a physical board controller. Opening it scans for Kilter, MoonBoard and Tension boards nearby; the
 * climber picks one and confirms its layout. When nothing is found, the layout can be picked by hand.
 * Connecting never auto-lights LEDs and never connects automatically (FR-002, FR-003, FR-011, FR-017).
 */
export function BoardScreen({
  container,
  selection,
  gymName,
  onBack,
  onOpenDiagnostics,
  onChooseLayout,
  onUseLayout,
}: BoardScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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

  const connecting = snapshot.connection === 'connecting';
  const lost = snapshot.connection === 'lost';
  const scanning = scan.state === 'scanning';

  const body = (() => {
    if (connected && snapshot.board && !choosing) {
      return (
        <View style={styles.state}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.connected }]} />
            <AppText variant="caption" tone="muted">
              Connected
            </AppText>
          </View>
          <ManufacturerMark manufacturer={snapshot.board.manufacturer} size={56} />
          <AppText variant="display" numberOfLines={2}>
            {snapshot.board.name ?? describeManufacturer(snapshot.board.manufacturer)}
          </AppText>
          {snapshot.configuration ? (
            <AppText tone="muted">{describeConfiguration(snapshot.configuration)}</AppText>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Change layout"
              onPress={() => {
                if (snapshot.board) pick(snapshot.board);
                setEditingLayout(true);
              }}
            />
            <Button label="Disconnect" onPress={() => void container.session.disconnect()} />
          </View>
        </View>
      );
    }
    if (connecting) {
      return (
        <View style={styles.state} accessibilityLiveRegion="polite">
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.text} />
            <AppText variant="bodyStrong">Connecting to {snapshot.board?.name ?? 'board'}…</AppText>
          </View>
          <Button label="Cancel" onPress={() => void container.session.disconnect()} />
        </View>
      );
    }
    if (lost && !choosing) {
      return (
        <View style={styles.state}>
          <AppText variant="title">Lost connection to {snapshot.board?.name ?? 'board'}</AppText>
          <View style={styles.actions}>
            <Button
              label="Reconnect"
              variant="primary"
              large
              onPress={() => void container.session.reconnect()}
            />
            <Button label="Disconnect" onPress={() => void container.session.disconnect()} />
          </View>
        </View>
      );
    }
    if (choosing) {
      return (
        <View style={styles.state}>
          <AppText variant="display" numberOfLines={2} accessibilityRole="header">
            {boardLabel(choosing)}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              selectedLayout ? `Layout ${describeConfiguration(selectedLayout)}. Change` : 'Choose layout'
            }
            disabled={layouts.length === 0}
            onPress={() => setEditingLayout(true)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowText}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {selectedLayout
                  ? describeConfiguration(selectedLayout)
                  : entries === null
                    ? 'Loading layouts…'
                    : entry && !entry.ok
                      ? 'Layouts unavailable'
                      : 'Choose layout'}
              </AppText>
              <AppText variant="caption" tone="muted">
                {describeManufacturer(choosing.manufacturer)}
              </AppText>
            </View>
            <Icon name="chevronRight" color={colors.textMuted} size={16} />
          </Pressable>
          <ModeBanner mode={container.mode} persistent={container.persistent} />
          <View style={styles.actions}>
            <Button label="Connect" variant="primary" large disabled={!selectedLayout} onPress={connect} />
            <Button label="Cancel" onPress={() => setChoosing(null)} />
          </View>
        </View>
      );
    }
    if (scanning && discovered.length === 0) {
      return (
        <View style={[styles.state, styles.centered]} accessibilityLiveRegion="polite">
          <ScanPulse />
          <View style={styles.centeredText}>
            <AppText variant="title">Looking for boards…</AppText>
            <AppText tone="muted" style={styles.textCenter}>
              Stand near the wall. Tap your board when it appears.
            </AppText>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          {scanning ? <ActivityIndicator color={colors.text} /> : null}
          <AppText variant="title">
            {scanning
              ? 'Looking for boards…'
              : discovered.length > 0
                ? 'Choose your board'
                : failure
                  ? failure.title
                  : describeBoardError('board_not_found').title}
          </AppText>
        </View>
        {connectionError ? (
          <Notice tone="error" title={connectionError.title} message={connectionError.action} />
        ) : null}
        {failure ? <AppText tone="muted">{failure.action}</AppText> : null}
        {discovered.length > 0 ? (
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {discovered.map((board, index) => (
              <Pressable
                key={`${board.manufacturer}/${board.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${boardLabel(board)}, ${describeManufacturer(board.manufacturer)}`}
                onPress={() => pick(board)}
                style={({ pressed }) => [
                  styles.listRow,
                  index > 0 && { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <ManufacturerMark manufacturer={board.manufacturer} size={32} />
                <View style={styles.rowText}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {boardLabel(board)}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {describeManufacturer(board.manufacturer)}
                  </AppText>
                </View>
                <Icon name="chevronRight" color={colors.textMuted} size={16} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {scanning ? null : <Button label="Scan again" onPress={() => void search()} />}
        {scanning || discovered.length > 0 ? null : (
          <View style={styles.manual}>
            <AppText variant="caption" tone="muted">
              Or pick the board yourself
            </AppText>
            <BoardPicker selection={selection} onPress={onChooseLayout} />
          </View>
        )}
      </View>
    );
  })();

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.bar}>
        <IconButton icon="back" label="Back" onPress={onBack} />
        {gymName ? (
          <AppText variant="eyebrow" tone="muted" numberOfLines={1} style={styles.gym}>
            {gymName}
          </AppText>
        ) : null}
        <IconButton
          icon="pulse"
          label="Diagnostics"
          accessibilityHint="Connection history and errors"
          onPress={onOpenDiagnostics}
        />
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, scanning && discovered.length === 0 && styles.fill]}
      >
        {body}
      </ScrollView>
      {choosing ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  gym: { flex: 1, textAlign: 'center' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  state: { gap: spacing.lg },
  fill: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.xxl * 3 },
  centered: { alignItems: 'center' },
  centeredText: { alignItems: 'center', gap: spacing.xs, maxWidth: 300 },
  textCenter: { textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { gap: spacing.sm },
  list: { borderRadius: radii.lg, overflow: 'hidden' },
  listRow: {
    minHeight: touchTarget + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    minHeight: touchTarget + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  rowText: { flex: 1, minWidth: 0 },
  manual: { gap: spacing.sm, marginTop: spacing.lg },
  pressed: { opacity: 0.7 },
});
