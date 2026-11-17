import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { AccessibilityActionEvent, GestureResponderHandlers } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { shadows } from '../tokens/shadows';
import { touchTarget } from '../tokens/layout';

interface RangeSliderProps {
  /** Number of positions; the thumbs sit on 0 … count - 1. */
  count: number;
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
  const live = useRef(range);
  live.current = range;
  const props = useRef({ width, count, onPreview, onChange });
  props.current = { width, count, onPreview, onChange };

  useEffect(() => setRange([low, high]), [low, high]);

  const last = Math.max(1, count - 1);
  const xFor = (index: number) => (width * index) / last;

  const responder = (thumb: 0 | 1): GestureResponderHandlers => {
    let start = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start = (props.current.width * live.current[thumb]) / Math.max(1, props.current.count - 1);
      },
      onPanResponderMove: (_event, gesture) => {
        const { width: w, count: n } = props.current;
        if (w <= 0) return;
        const raw = Math.round(((start + gesture.dx) / w) * (n - 1));
        const clamped = Math.max(0, Math.min(n - 1, raw));
        const [l, h] = live.current;
        const next: [number, number] = thumb === 0 ? [Math.min(clamped, h), h] : [l, Math.max(clamped, l)];
        if (next[0] !== l || next[1] !== h) {
          setRange(next);
          live.current = next;
          props.current.onPreview?.(next[0], next[1]);
        }
      },
      onPanResponderRelease: () => props.current.onChange(live.current[0], live.current[1]),
      onPanResponderTerminate: () => props.current.onChange(live.current[0], live.current[1]),
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
      style={[styles.hit, { left: xFor(range[index]) - touchTarget / 2 }]}
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
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.text, left: xFor(range[0]), width: xFor(range[1]) - xFor(range[0]) },
          ]}
        />
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
