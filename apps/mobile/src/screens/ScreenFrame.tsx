import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, spacing, useTheme } from '@boardclimb/design-system';

interface ScreenFrameProps {
  title: string;
  onBack?: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
}

/** Page chrome: safe areas, a back control, the title and one optional action. Content is capped for tablets and desktop. */
export function ScreenFrame({ title, onBack, headerRight, children }: ScreenFrameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.column}>
        <View style={styles.header}>
          {onBack ? <Button label="Back" onPress={onBack} /> : null}
          <View style={styles.title} accessibilityRole="header">
            <AppText variant="title" numberOfLines={2}>
              {title}
            </AppText>
          </View>
          {headerRight}
        </View>
        <View style={styles.body} role="main">
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { flex: 1 },
  body: { flex: 1 },
});
