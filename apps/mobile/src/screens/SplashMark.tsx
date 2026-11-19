import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { BLOCKS } from '@boardclimb/design-system';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface Point {
  x: number;
  y: number;
}

/**
 * A route that lights hold by hold into a B for BoardClimb: up the spine, round the top bowl, round the bottom
 * bowl and back to the start hold.
 */
const ROUTE: readonly Point[] = [
  { x: 28, y: 84 },
  { x: 28, y: 50 },
  { x: 28, y: 16 },
  { x: 60, y: 17 },
  { x: 72, y: 31 },
  { x: 54, y: 48 },
  { x: 76, y: 65 },
  { x: 64, y: 84 },
  { x: 28, y: 84 },
];
const SEGMENTS = ROUTE.length - 1;
const GRID = [14, 32, 50, 68, 86];
const NEON = BLOCKS.yellow.bg;
/** Time to draw one segment of the route. */
const SEGMENT_MS = 130;
/** The finished mark flashes once, then rests before the splash hands over. */
const FLASH_MS = 420;
const REST_MS = 520;
const SEGMENT_EASING = Easing.inOut(Easing.cubic);

function length(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Piecewise ranges that move the spark along every segment, eased like the line it draws. */
function sparkRange(axis: 'x' | 'y'): { inputRange: number[]; outputRange: number[] } {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  ROUTE.forEach((point, index) => {
    inputRange.push(index);
    outputRange.push(point[axis]);
  });
  return { inputRange, outputRange };
}

interface SplashMarkProps {
  size?: number;
  /** Called once the route has drawn, flashed and rested; the splash can leave after this. */
  onFinished?: () => void;
}

/** Splash animation built from the app mark. Shown fully lit and still when the phone asks for less motion. */
export function SplashMark({ size = 148, onFinished }: SplashMarkProps) {
  const step = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState<boolean | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => {
        if (alive) setReduced(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      step.setValue(SEGMENTS);
      const timer = setTimeout(() => finished.current?.(), REST_MS);
      return () => clearTimeout(timer);
    }
    // SVG stroke, radius and opacity props are animated on the JS side.
    const animation = Animated.sequence([
      Animated.delay(120),
      Animated.timing(step, {
        toValue: SEGMENTS,
        duration: SEGMENTS * SEGMENT_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(flash, {
        toValue: 1,
        duration: FLASH_MS * 0.35,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(flash, {
        toValue: 0.55,
        duration: FLASH_MS * 0.65,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(REST_MS),
    ]);
    animation.start(({ finished: done }) => {
      if (done) finished.current?.();
    });
    return () => animation.stop();
  }, [reduced, step, flash]);

  const settled = reduced === true;
  /** 0 until the line reaches this hold, then 1. */
  const reached = (index: number) =>
    step.interpolate({ inputRange: [index - 0.05, index], outputRange: [0, 1], extrapolate: 'clamp' });
  /** Ring radius: pops past its size as the line arrives, then settles. */
  const ringRadius = (index: number) =>
    step.interpolate({
      inputRange: [index - 0.05, index, index + 0.35],
      outputRange: [3, 8.4, 6.4],
      extrapolate: 'clamp',
    });
  const x = sparkRange('x');
  const y = sparkRange('y');
  const sparkOpacity = step.interpolate({
    inputRange: [0, 0.1, SEGMENTS - 0.1, SEGMENTS],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.24 },
        Platform.OS === 'ios'
          ? {
              shadowOpacity: settled
                ? 0.3
                : flash.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.5] }),
            }
          : null,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="6" y="6" width="88" height="88" rx="8" fill="none" stroke="#2A2C31" strokeWidth="0.8" />
        {GRID.flatMap((gy) =>
          GRID.map((gx) => <Circle key={`${gx}-${gy}`} cx={gx} cy={gy} r="1.4" fill="#34373D" />),
        )}
        {ROUTE.slice(1).map((to, index) => {
          const from = ROUTE[index]!;
          const span = length(from, to);
          return (
            <AnimatedLine
              key={`line-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={NEON}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray={`${span} ${span}`}
              strokeDashoffset={step.interpolate({
                inputRange: [index, index + 1],
                outputRange: [span, 0],
                easing: SEGMENT_EASING,
                extrapolate: 'clamp',
              })}
            />
          );
        })}
        {ROUTE.map((hold, index) => (
          <AnimatedCircle
            key={`glow-${index}`}
            cx={hold.x}
            cy={hold.y}
            r="9"
            fill={NEON}
            opacity={Animated.multiply(
              reached(index),
              flash.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.34] }),
            )}
          />
        ))}
        {ROUTE.map((hold, index) => (
          <Circle key={`hold-${index}`} cx={hold.x} cy={hold.y} r="4.2" fill="#8C918C" />
        ))}
        {ROUTE.map((hold, index) => (
          <AnimatedCircle
            key={`ring-${index}`}
            cx={hold.x}
            cy={hold.y}
            r={ringRadius(index)}
            fill="none"
            stroke={NEON}
            strokeWidth="2"
            opacity={reached(index)}
          />
        ))}
        {settled ? null : (
          <>
            <AnimatedCircle
              cx={step.interpolate({ ...x, easing: SEGMENT_EASING, extrapolate: 'clamp' })}
              cy={step.interpolate({ ...y, easing: SEGMENT_EASING, extrapolate: 'clamp' })}
              r="5"
              fill={NEON}
              opacity={Animated.multiply(sparkOpacity, 0.35)}
            />
            <AnimatedCircle
              cx={step.interpolate({ ...x, easing: SEGMENT_EASING, extrapolate: 'clamp' })}
              cy={step.interpolate({ ...y, easing: SEGMENT_EASING, extrapolate: 'clamp' })}
              r="2.2"
              fill="#FFFFFF"
              opacity={sparkOpacity}
            />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#141518',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BLOCKS.yellow.bg,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
});
