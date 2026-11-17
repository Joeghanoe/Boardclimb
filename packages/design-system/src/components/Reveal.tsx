import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { motion } from '../tokens/motion';

interface RevealProps {
  children: ReactNode;
  /** Plays again whenever this changes (for example the problem shown). */
  trigger?: string | number;
  /** Where the content slides in from, in points; 0 fades in place. */
  fromX?: number;
  fromY?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades and slides its content in on mount and on every new `trigger`. Off when the phone asks for less motion. */
export function Reveal({
  children,
  trigger,
  fromX = 0,
  fromY = 0,
  duration = motion.content,
  style,
}: RevealProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: motion.easing,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [trigger, reduced, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
