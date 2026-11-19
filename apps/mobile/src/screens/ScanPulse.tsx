import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@boardclimb/design-system';
import MARK from '../../assets/icon.png';

const SIZE = 168;
const MARK_SIZE = 72;
const RINGS = 3;
const PERIOD_MS = 2400;

/** The app mark with rings spreading out from it while the phone looks for boards. Still when the phone asks for less motion. */
export function ScanPulse() {
  const { colors } = useTheme();
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
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: PERIOD_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduced]);

  return (
    <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: RINGS }, (_, index) => {
        // Each ring starts a third of a period after the one before it.
        const phase = Animated.modulo(Animated.add(progress, index / RINGS), 1);
        return (
          <Animated.View
            key={index}
            style={[
              styles.ring,
              { borderColor: colors.primary },
              reduced
                ? { opacity: 0.25, transform: [{ scale: 0.55 + index * 0.2 }] }
                : {
                    opacity: phase.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }),
                    transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
                  },
            ]}
          />
        );
      })}
      <Image source={MARK} style={styles.mark} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
  },
  mark: { width: MARK_SIZE, height: MARK_SIZE, borderRadius: MARK_SIZE * 0.24 },
});
