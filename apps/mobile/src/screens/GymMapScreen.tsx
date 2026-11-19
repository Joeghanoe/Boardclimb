import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GymFinder, GymMatch } from '@boardclimb/application';
import {
  AppText,
  Button,
  Icon,
  IconButton,
  Notice,
  radii,
  shadows,
  spacing,
  touchTarget,
  useTheme,
} from '@boardclimb/design-system';
import { MANUFACTURERS, distanceKm, gymManufacturers } from '@boardclimb/domain';
import type { GeoPoint, Gym, Manufacturer } from '@boardclimb/domain';
import type { GymMapFocus } from './GymMapFocus';
import { GymMapView } from './GymMapView';
import { ManufacturerMark } from './ManufacturerMark';
import { EdgeFade } from './EdgeFade';
import { PickerPill } from './PickerPill';
import type { LayoutPreset } from './presentation/LayoutPreset';
import { describeGymBoard } from './presentation/describeGymBoard';
import { describeGymPlace } from './presentation/describeGymPlace';
import { describeManufacturer } from './presentation/describeManufacturer';
import { formatDistance } from './presentation/formatDistance';
import { layoutPresetFor } from './presentation/layoutPresetFor';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface GymMapScreenProps {
  gyms: GymFinder;
  /** Where the map opened last time in this app session. */
  initial: GymMapFocus;
  onLeave: (center: GymMapFocus) => void;
  /** First visit this app session: move to the climber's position once it is known. Later visits keep `initial`. */
  startAtUser: boolean;
  onBack: () => void;
  /** Starts connecting to one of a gym's boards; the climber still picks the controller and confirms the layout. */
  onClimb: (preset: LayoutPreset) => void;
}

/** Gyms drawn at once: the nearest to the centre. Enough to fill a city; more slows the map down. */
const SHOWN = 150;
const RESULTS = 6;
const GYM_SPAN = 0.03;
const AREA_SPAN = 0.25;
/** The first view around the climber: zoomed out to the gyms within about an hour's drive. */
const START_SPAN = 1.5;

/**
 * One map for every Kilter, MoonBoard and Tension gym. Filter by board, search by name or city, or
 * jump to where you are. Choosing a gym's board opens the board picker there; nothing touches the board
 * or the log from here.
 */
export function GymMapScreen({ gyms, initial, onLeave, startAtUser, onBack, onClimb }: GymMapScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [text, setText] = useState('');
  const [center, setCenter] = useState<GeoPoint>(initial.point);
  const [matches, setMatches] = useState<GymMatch[]>([]);
  const [results, setResults] = useState<GymMatch[] | null>(null);
  const [selected, setSelected] = useState<Gym | null>(null);
  const [focus, setFocus] = useState<GymMapFocus | null>(null);
  // Opening the gym map asks for location straight away, so it can start where the climber is.
  const [locating, setLocating] = useState<'waiting' | 'found' | 'failed'>('waiting');
  const [user, setUser] = useState<GeoPoint | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const span = useRef(initial.span);
  /** The span to move to when the next position arrives; null keeps the map where it is. */
  const moveOnFix = useRef<number | null>(startAtUser ? START_SPAN : null);

  useEffect(() => {
    let current = true;
    gyms.find({ near: center, manufacturer, text: '', limit: SHOWN }).then(
      (found) => {
        if (!current) return;
        setFailed(false);
        setMatches(found);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [gyms, center, manufacturer, attempt]);

  useEffect(() => {
    if (text.trim() === '') {
      setResults(null);
      return;
    }
    let current = true;
    gyms.find({ near: user ?? center, manufacturer, text, limit: RESULTS }).then(
      (found) => {
        if (current) setResults(found);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
    // The centre is left out on purpose: results stay put while the map moves under them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gyms, text, manufacturer, user]);

  const leave = () => {
    onLeave({ point: center, span: span.current });
    onBack();
  };
  const show = (gym: Gym) => {
    Keyboard.dismiss();
    setSelected(gym);
    setText('');
    span.current = GYM_SPAN;
    setFocus({ point: gym, span: GYM_SPAN });
  };
  const locate = () => {
    if (user) {
      span.current = AREA_SPAN;
      setFocus({ point: user, span: AREA_SPAN });
      return;
    }
    moveOnFix.current = AREA_SPAN;
    setLocating('waiting');
  };
  const located = useCallback((point: GeoPoint) => {
    setUser(point);
    setLocating('found');
    const move = moveOnFix.current;
    if (move === null) return;
    moveOnFix.current = null;
    span.current = move;
    setFocus({ point, span: move });
  }, []);
  const denied = useCallback(() => setLocating('failed'), []);

  // The selected gym stays drawn even after the map moves away from it.
  const drawn =
    selected && !matches.some((match) => match.gym.id === selected.id)
      ? [...matches, { gym: selected, distanceKm: null }]
      : matches;
  const place = selected ? describeGymPlace(selected) : null;
  const away = selected && user ? formatDistance(distanceKm(user, selected)) : null;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]} role="main">
      <View style={styles.map}>
        {failed ? (
          <View style={styles.failed} accessibilityRole="alert">
            <Notice tone="error" title="Could not open the gym map" message="Try again." />
            <Button label="Try again" variant="primary" onPress={() => setAttempt((n) => n + 1)} />
          </View>
        ) : (
          <GymMapView
            matches={drawn}
            selectedId={selected?.id ?? null}
            initial={initial}
            focus={focus}
            showUser={locating !== 'failed'}
            onSelect={show}
            onCenterChange={setCenter}
            onUserLocation={located}
            onLocationDenied={denied}
          />
        )}

        <View
          style={[styles.bottom, selected ? null : { paddingBottom: insets.bottom + spacing.md }]}
          pointerEvents="box-none"
        >
          {locating === 'failed' ? (
            <View style={[styles.card, styles.inset]}>
              <Notice
                title="Could not find your location"
                message="Allow location for BoardClimb in Settings, or search for your city."
              />
            </View>
          ) : null}
          {Platform.OS === 'web' ? null : (
            <View style={[styles.nearMe, styles.inset]} pointerEvents="box-none">
              <IconButton icon="locate" label="Near me" busy={locating === 'waiting'} onPress={locate} />
            </View>
          )}
          {selected ? (
            <View
              style={[
                styles.sheet,
                { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
                shadows.soft,
              ]}
            >
              <View style={[styles.handle, { backgroundColor: colors.divider }]} />
              <View style={styles.gymHead}>
                <View style={styles.gymTitle}>
                  <AppText variant="title" numberOfLines={2} accessibilityRole="header">
                    {selected.name}
                  </AppText>
                  {place || away ? (
                    <AppText tone="muted" numberOfLines={1}>
                      {[place, away].filter(Boolean).join(' · ')}
                    </AppText>
                  ) : null}
                </View>
                <IconButton
                  icon="close"
                  label="Close gym"
                  variant="raised"
                  onPress={() => setSelected(null)}
                />
              </View>
              <ScrollView style={styles.boards} contentContainerStyle={styles.boardList}>
                {selected.boards.map((board, index) => {
                  const words = describeGymBoard(board);
                  return (
                    <View
                      key={`${board.manufacturer}:${index}`}
                      style={[
                        styles.board,
                        index > 0 && {
                          borderTopColor: colors.divider,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <ManufacturerMark manufacturer={board.manufacturer} />
                      <View style={styles.boardText}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {words.title}
                        </AppText>
                        {words.detail ? (
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            {words.detail}
                          </AppText>
                        ) : null}
                      </View>
                      <IconButton
                        icon="climb"
                        label={`Climb ${words.title}`}
                        variant="solid"
                        fill={colors.primary}
                        onFill={colors.onPrimary}
                        accessibilityHint={`Find and connect the ${describeManufacturer(board.manufacturer)} board at this gym`}
                        onPress={() => {
                          onLeave({ point: selected, span: GYM_SPAN });
                          onClimb(layoutPresetFor(selected, board));
                        }}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
      >
        <EdgeFade color={colors.background} edge="top" />
        <View style={styles.column}>
          <View style={styles.searchRow}>
            <IconButton icon="back" label="Back" onPress={leave} />
            <View style={[styles.searchBox, { backgroundColor: colors.surface }, shadows.soft]}>
              <Icon name="search" color={colors.textMuted} size={18} />
              <TextInput
                accessibilityLabel="Search gyms or cities"
                value={text}
                onChangeText={setText}
                placeholder="Search gyms or cities"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                autoCorrect={false}
                style={[styles.search, { color: colors.text }]}
              />
              {text ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setText('')}
                  hitSlop={8}
                  style={styles.clear}
                >
                  <Icon name="close" color={colors.textMuted} size={18} />
                </Pressable>
              ) : null}
            </View>
          </View>
          {results ? null : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pills}
              role="group"
              accessibilityLabel="Boards to show"
            >
              <PickerPill
                label="All boards"
                selected={manufacturer === null}
                block="stone"
                onPress={() => setManufacturer(null)}
              />
              {MANUFACTURERS.map((item) => (
                <PickerPill
                  key={item}
                  label={describeManufacturer(item)}
                  manufacturer={item}
                  markOnly
                  selected={manufacturer === item}
                  block={manufacturerBlocks(item).from}
                  onPress={() => setManufacturer(item)}
                />
              ))}
            </ScrollView>
          )}
          {results ? (
            <View style={[styles.results, { backgroundColor: colors.surface }, shadows.soft]}>
              {results.length === 0 ? (
                <View style={styles.resultEmpty} accessibilityLiveRegion="polite">
                  <AppText variant="bodyStrong">
                    No gyms match “{text.trim()}”
                    {manufacturer ? ` with a ${describeManufacturer(manufacturer)}` : ''}
                  </AppText>
                  <AppText tone="muted">Try the gym’s name or its city.</AppText>
                </View>
              ) : (
                results.map(({ gym, distanceKm: km }, index) => {
                  const where = describeGymPlace(gym);
                  return (
                    <Pressable
                      key={gym.id}
                      accessibilityRole="button"
                      accessibilityLabel={where ? `${gym.name}, ${where}` : gym.name}
                      onPress={() => show(gym)}
                      style={({ pressed }) => [
                        styles.result,
                        index > 0 && {
                          borderTopColor: colors.divider,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                        pressed && { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <View style={styles.resultMarks}>
                        {gymManufacturers(gym).map((maker) => (
                          <ManufacturerMark key={maker} manufacturer={maker} size={24} />
                        ))}
                      </View>
                      <View style={styles.resultText}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {gym.name}
                        </AppText>
                        {where ? (
                          <AppText variant="caption" tone="muted" numberOfLines={1}>
                            {where}
                          </AppText>
                        ) : null}
                      </View>
                      {user && km !== null ? (
                        <AppText variant="caption" tone="muted">
                          {formatDistance(km)}
                        </AppText>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  /** Floats over the map: no bar, only a soft fade behind the status bar and controls. */
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: spacing.lg, zIndex: 2 },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchBox: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
  search: { flex: 1, minHeight: 46, fontSize: 16 },
  clear: {
    minWidth: touchTarget / 2,
    minHeight: touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { gap: spacing.sm, paddingVertical: 2 },
  results: { borderRadius: radii.lg, overflow: 'hidden' },
  result: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resultMarks: { flexDirection: 'row', gap: 4, minWidth: 24 },
  resultText: { flex: 1, gap: 2 },
  resultEmpty: { padding: spacing.lg, gap: spacing.xs },
  map: { flex: 1, overflow: 'hidden' },
  failed: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.lg },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    alignItems: 'center',
  },
  inset: { paddingHorizontal: spacing.lg },
  nearMe: { alignSelf: 'stretch', maxWidth: 720, width: '100%', alignItems: 'flex-end' },
  card: { width: '100%', maxWidth: 720 },
  /** The gym, attached to the bottom edge like a sheet, so it reads as part of the map screen. */
  sheet: {
    width: '100%',
    maxWidth: 720,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    // The same edge as the search box and pills above.
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  gymHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  gymTitle: { flex: 1, gap: 2 },
  boards: { maxHeight: 260 },
  boardList: {},
  board: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  boardText: { flex: 1, gap: 2 },
});
