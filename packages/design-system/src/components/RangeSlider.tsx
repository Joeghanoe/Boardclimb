import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { AccessibilityActionEvent, GestureResponderHandlers } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { shadows } from '../tokens/shadows';
import { touchTarget } from '../tokens/layout';

interface RangeSliderProps {
  /** Number of positions; the thumbs sit on 0 … count - 1. */
  count: number;
  /**
   * Where each position sits along the track, 0 to 1 and increasing. Evenly spaced when left out. Two scales that
   * share these fractions keep a thumb in place when the climber switches between them.
   */
  positions?: readonly number[];
  low: number;
  high: number;
  /** While dragging, for live labels. */
  onPreview?: (low: number, high: number) => void;
  /** When a thumb is let go or stepped: commit the range. */
  onChange: (low: number, high: number) => void;
  /** Spoken value of a position, for example "6A". */
  describe: (index: number) => string;
  lowLabel: string;
  highLabel: string;
}

const THUMB = 28;

/**
 * Two thumbs on one track. Each thumb is an adjustable control screen readers step with increment and
 * decrement, so dragging is never the only way to change the range (NFR-007).
 */
export function RangeSlider({
  count,
  positions,
  low,
  high,
  onPreview,
  onChange,
  describe,
  lowLabel,
  highLabel,
}: RangeSliderProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<[number, number]>([low, high]);
  /** The dragged thumb follows the finger exactly; it snaps to the nearest position when let go. */
  const [drag, setDrag] = useState<{ thumb: 0 | 1; x: number } | null>(null);
  const live = useRef(range);
  live.current = range;
  const fractionFor = (index: number) =>
    positions?.[index] ?? (count <= 1 ? 0 : index / Math.max(1, count - 1));
  const props = useRef({ width, count, onPreview, onChange, fractionFor });
  props.current = { width, count, onPreview, onChange, fractionFor };

  useEffect(() => setRange([low, high]), [low, high]);

  const xFor = (index: number) => width * fractionFor(index);
  const xOf = (thumb: 0 | 1) => (drag?.thumb === thumb ? drag.x : xFor(range[thumb]));

  const responder = (thumb: 0 | 1): GestureResponderHandlers => {
    let start = 0;
    const finish = () => {
      setDrag(null);
      props.current.onChange(live.current[0], live.current[1]);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start = props.current.width * props.current.fractionFor(live.current[thumb]);
      },
      onPanResponderMove: (_event, gesture) => {
        const { width: w, count: n, fractionFor: at } = props.current;
        if (w <= 0) return;
        const [l, h] = live.current;
        // A thumb never passes the other one.
        const min = thumb === 0 ? 0 : w * at(l);
        const max = thumb === 0 ? w * at(h) : w;
        const x = Math.max(min, Math.min(max, start + gesture.dx));
        setDrag({ thumb, x });
        let nearest = 0;
        for (let index = 1; index < n; index += 1)
          if (Math.abs(w * at(index) - x) < Math.abs(w * at(nearest) - x)) nearest = index;
        const next: [number, number] = thumb === 0 ? [Math.min(nearest, h), h] : [l, Math.max(nearest, l)];
        if (next[0] !== l || next[1] !== h) {
          setRange(next);
          live.current = next;
          props.current.onPreview?.(next[0], next[1]);
        }
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    }).panHandlers;
  };
  const [lowHandlers] = useState(() => responder(0));
  const [highHandlers] = useState(() => responder(1));

  const step = (thumb: 0 | 1, event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const [l, h] = range;
    const next: [number, number] =
      thumb === 0
        ? [Math.max(0, Math.min(h, l + delta)), h]
        : [l, Math.min(count - 1, Math.max(l, h + delta))];
    setRange(next);
    onChange(next[0], next[1]);
  };

  const thumb = (index: 0 | 1, handlers: GestureResponderHandlers) => (
    <View
      {...handlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={index === 0 ? lowLabel : highLabel}
      accessibilityValue={{ text: describe(range[index]) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(index, event)}
      hitSlop={8}
      style={[styles.hit, { left: xOf(index) - touchTarget / 2 }]}
    >
      <View
        style={[styles.thumb, { backgroundColor: colors.surface, borderColor: colors.text }, shadows.soft]}
      />
    </View>
  );

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width - THUMB)}>
      <View style={styles.inner}>
        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]} />
        <View style={[styles.fill, { backgroundColor: colors.text, left: xOf(0), width: xOf(1) - xOf(0) }]} />
        {thumb(0, lowHandlers)}
        {thumb(1, highHandlers)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: touchTarget, justifyContent: 'center', paddingHorizontal: THUMB / 2 },
  inner: { height: touchTarget, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3 },
  fill: { position: 'absolute', height: 6, borderRadius: 3 },
  hit: {
    position: 'absolute',
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3 },
});
