import { StyleSheet, View } from 'react-native';
import { AppText, Icon, radii, spacing, useTheme } from '@boardclimb/design-system';
import { describeMode } from './presentation/describeMode';
import { describePersistence } from './presentation/describePersistence';

interface ModeBannerProps {
  mode: 'sample' | 'unverified' | 'live';
  persistent: boolean;
}

/** One quiet strip for sample data and unsaved records; nothing is shown once real sources and storage are in use. */
export function ModeBanner({ mode, persistent }: ModeBannerProps) {
  const { colors } = useTheme();
  const sample = describeMode(mode);
  const unsaved = describePersistence(persistent);
  const first = sample ?? unsaved;
  if (!first) return null;
  const message = sample && unsaved ? `${sample.action} ${unsaved.action}` : first.action;
  return (
    <View
      accessibilityRole="summary"
      accessible
      accessibilityLabel={`${first.title}. ${message}`}
      style={[styles.strip, { backgroundColor: colors.surfaceMuted }]}
    >
      <Icon name="info" color={colors.textMuted} size={18} />
      <AppText variant="caption" tone="muted" style={styles.message}>
        <AppText variant="caption" style={{ fontWeight: '800', color: colors.text }}>
          {first.title}.{' '}
        </AppText>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },
  message: { flex: 1 },
});
