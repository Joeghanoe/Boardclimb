import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText, BLOCKS, Notice, ThemeContext, darkTheme, spacing } from '@boardclimb/design-system';
import type { AppContainer } from './src/composition/AppContainer';
import { createDeviceContainer } from './src/composition/createDeviceContainer';
import { AppShell } from './src/screens/AppShell';
import { SplashMark } from './src/screens/SplashMark';
import { describeLogError } from './src/screens/presentation/describeLogError';

const EXIT_MS = 420;

/** The app root: shows the branded splash while storage opens, then hands the screens their use cases. Always dark. */
export default function App() {
  // Always dark: it matches the app mark, and a dim screen is easier to read in a gym than a bright one.
  const theme = darkTheme;
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [failed, setFailed] = useState(false);
  // The splash plays through once, so the route always finishes lighting before the list appears.
  const [played, setPlayed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const exit = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    createDeviceContainer().then(setContainer, () => setFailed(true));
    Animated.timing(title, {
      toValue: 1,
      duration: 600,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [title]);

  const ready = container !== null && played;
  useEffect(() => {
    if (!ready) return;
    const animation = Animated.timing(exit, {
      toValue: 1,
      duration: EXIT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setSplashGone(true);
    });
    return () => animation.stop();
  }, [ready, exit]);

  const unreadable = describeLogError('storage_corrupt');
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <StatusBar style="light" />
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
          {ready ? <AppShell container={container} /> : null}
          {splashGone ? null : (
            <Animated.View
              pointerEvents={ready ? 'none' : 'auto'}
              style={[
                StyleSheet.absoluteFill,
                styles.splash,
                {
                  backgroundColor: theme.colors.background,
                  opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.stack,
                  {
                    transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
                  },
                ]}
              >
                <SplashMark onFinished={() => setPlayed(true)} />
                <Animated.View
                  style={{
                    opacity: title,
                    transform: [
                      { translateY: title.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                    ],
                  }}
                >
                  <AppText
                    variant="display"
                    style={{ color: BLOCKS.yellow.bg }}
                    accessibilityRole="header"
                    accessibilityLabel="BoardClimb, opening your saved problems"
                  >
                    BoardClimb
                  </AppText>
                </Animated.View>
              </Animated.View>
              {failed ? <Notice tone="error" title={unreadable.title} message={unreadable.action} /> : null}
            </Animated.View>
          )}
        </View>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splash: { alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: spacing.lg },
  stack: { alignItems: 'center', gap: spacing.xl },
});
