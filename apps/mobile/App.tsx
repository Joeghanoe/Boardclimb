import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText, Notice, ThemeContext, darkTheme, lightTheme, spacing } from '@boardclimb/design-system';
import type { AppContainer } from './src/composition/AppContainer';
import { createDeviceContainer } from './src/composition/createDeviceContainer';
import { AppShell } from './src/screens/AppShell';
import { describeLogError } from './src/screens/presentation/describeLogError';

/** The app root: opens storage, then hands the screens their use cases. The theme follows the phone's setting. */
export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    createDeviceContainer().then(setContainer, () => setFailed(true));
  }, []);

  const unreadable = describeLogError('storage_corrupt');
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
        {container ? (
          <AppShell container={container} />
        ) : (
          <View style={[styles.splash, { backgroundColor: theme.colors.background }]}>
            {failed ? (
              <Notice tone="error" title={unreadable.title} message={unreadable.action} />
            ) : (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <AppText tone="muted">Opening your saved problems…</AppText>
              </>
            )}
          </View>
        )}
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
});
