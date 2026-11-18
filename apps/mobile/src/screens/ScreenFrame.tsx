import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton, spacing, useTheme } from '@boardclimb/design-system';

interface ScreenFrameProps {
  title: string;
  /** Small line above the title, for example the board being browsed. */
  eyebrow?: string;
  /** Inactive preserved screens are outside the current document landmarks. */
  active?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
  backdrop?: ReactNode;
  titleVariant?: 'display' | 'title';
  children: ReactNode;
}

/** Page chrome: safe areas, a back control, the title and one optional action. Content is capped for tablets and desktop. */
export function ScreenFrame({
  title,
  eyebrow,
  onBack,
  headerRight,
  backdrop,
  titleVariant = 'display',
  children,
  active = true,
}: ScreenFrameProps) {
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
      {backdrop}
      <View style={styles.column}>
        <View style={styles.header}>
          {onBack ? <IconButton icon="back" label="Back" onPress={onBack} /> : null}
          <View style={styles.title} accessibilityRole={active ? 'header' : 'none'}>
            {eyebrow ? (
              <AppText variant="eyebrow" tone="muted" numberOfLines={1}>
                {eyebrow}
              </AppText>
            ) : null}
            <AppText variant={titleVariant} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {title}
            </AppText>
          </View>
          {headerRight}
        </View>
        <View style={styles.body} {...(active ? { role: 'main' as const } : {})}>
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { flexGrow: 1, flexShrink: 1, flexBasis: 140, gap: 2 },
  body: { flex: 1 },
});
