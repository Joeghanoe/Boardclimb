import { useEffect, useRef, useState } from 'react';
import type { ScrollViewInstance } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import type { BoardErrorCode, DiscoveredBoard } from '@boardclimb/application';
import { AppText, Button, Card, Chip, Notice, spacing } from '@boardclimb/design-system';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { BoardConfiguration, Manufacturer } from '@boardclimb/domain';
import type { AppContainer } from '../composition/AppContainer';
import { ConfigurationChooser } from './ConfigurationChooser';
import { ConnectionChip } from './ConnectionChip';
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
}

type Scan =
  | { state: 'idle' }
  | { state: 'scanning' }
  | { state: 'done'; boards: DiscoveredBoard[] }
  | { state: 'failed'; code: BoardErrorCode };

/**
 * Connect a physical board. The climber starts the scan and chooses the board and its layout; nothing is selected or
 * connected automatically (FR-002, FR-003), and connecting never changes the LEDs (FR-011, FR-017).
 */
export function BoardScreen({ container, selection, onBack, onOpenDiagnostics }: BoardScreenProps) {
  const scanEpoch = useRef(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const [editingLayout, setEditingLayout] = useState(false);
  const snapshot = useBoardSnapshot(container.session);
  const [manufacturer, setManufacturer] = useState<Manufacturer>(
    selection?.configuration.manufacturer ?? 'kilter',
  );
  const [scan, setScan] = useState<Scan>({ state: 'idle' });
  const [choosing, setChoosing] = useState<DiscoveredBoard | null>(null);
  const [layouts, setLayouts] = useState<BoardConfiguration[]>([]);
  const [layoutId, setLayoutId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    container.directory.list().then((entries) => {
      const entry = entries.find((candidate) => candidate.manufacturer === manufacturer);
      if (!cancelled) setLayouts(entry?.ok ? entry.boards.flatMap((board) => board.configurations) : []);
    });
    return () => {
      cancelled = true;
    };
  }, [container, manufacturer]);

  useEffect(
    () => () => {
      scanEpoch.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (choosing) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [choosing]);

  const search = async () => {
    const epoch = ++scanEpoch.current;
    setChoosing(null);
    setScan({ state: 'scanning' });
    const result = await container.session.discover(manufacturer);
    if (epoch !== scanEpoch.current) return;
    setScan(result.ok ? { state: 'done', boards: result.boards } : { state: 'failed', code: result.code });
  };

  const pick = (board: DiscoveredBoard) => {
    setChoosing(board);
    const suggested =
      layouts.find((layout) => layout.id === board.detectedConfigurationId) ??
      (selection?.configuration.manufacturer === board.manufacturer ? selection.configuration : null);
    setLayoutId(suggested?.id ?? null);
    setEditingLayout(suggested === null);
  };

  const connect = () => {
    const layout = layouts.find((candidate) => candidate.id === layoutId);
    if (!choosing || !layout) return;
    void container.session.connect(choosing, layout);
    setChoosing(null);
  };

  const failure = scan.state === 'failed' ? describeBoardError(scan.code) : null;
  const connectionError = snapshot.error ? describeBoardError(snapshot.error.code) : null;
  const connected = snapshot.connection === 'connected';

  return (
    <ScreenFrame title="Boards" onBack={onBack}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <ModeBanner mode={container.mode} persistent={container.persistent} />
        <Card>
          <ConnectionChip snapshot={snapshot} />
          {connectionError ? (
            <Notice tone="error" title={connectionError.title} message={connectionError.action} />
          ) : null}
          {snapshot.connection === 'lost' ? (
            <Button label="Reconnect" onPress={() => void container.session.reconnect()} />
          ) : null}
          {connected || snapshot.connection === 'lost' || snapshot.connection === 'connecting' ? (
            <Button
              label={snapshot.connection === 'connecting' ? 'Cancel connection' : 'Disconnect'}
              onPress={() => void container.session.disconnect()}
            />
          ) : null}
        </Card>

        {choosing ? (
          <Card>
            <AppText variant="bodyStrong" accessibilityRole="header" aria-level={2}>
              Connect to {choosing.name ?? 'this board'}
            </AppText>
            {layouts.find((c) => c.id === layoutId) ? (
              <AppText>{describeConfiguration(layouts.find((c) => c.id === layoutId)!)}</AppText>
            ) : (
              <AppText tone="muted">Choose the layout, size and angle shown at this wall.</AppText>
            )}
            <Button
              label="Connect"
              variant="primary"
              large
              disabled={!layouts.some((c) => c.id === layoutId)}
              onPress={connect}
            />
            <Button
              label={editingLayout ? 'Hide layout choices' : 'Change layout'}
              expanded={editingLayout}
              onPress={() => setEditingLayout(!editingLayout)}
            />
            {editingLayout ? (
              <ConfigurationChooser
                configurations={layouts}
                selectedId={layoutId}
                onChoose={(configuration) => {
                  setLayoutId(configuration.id);
                  setEditingLayout(false);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
              />
            ) : null}
            <Button label="Cancel selection" onPress={() => setChoosing(null)} />
          </Card>
        ) : null}

        <Card>
          <AppText variant="bodyStrong" accessibilityRole="header" aria-level={2}>
            Find a board
          </AppText>
          <View style={styles.chips}>
            {MANUFACTURERS.map((candidate) => (
              <Chip
                key={candidate}
                label={describeManufacturer(candidate)}
                selected={candidate === manufacturer}
                onPress={() => {
                  scanEpoch.current += 1;
                  setManufacturer(candidate);
                  setScan({ state: 'idle' });
                  setChoosing(null);
                }}
              />
            ))}
          </View>
          <Button
            label="Scan for boards"
            variant="primary"
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
          {scan.state === 'done'
            ? scan.boards.map((board) => (
                <Button
                  key={board.id}
                  label={board.name ?? 'Unnamed board'}
                  accessibilityHint="Choose this board"
                  onPress={() => pick(board)}
                />
              ))
            : null}
        </Card>

        <Button label="Diagnostics" onPress={onOpenDiagnostics} />
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
