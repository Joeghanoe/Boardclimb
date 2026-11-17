import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii, spacing } from '../tokens/layout';
import { AppText } from './AppText';
import { Button } from './Button';

interface NoticeProps {
  tone?: 'info' | 'error';
  /** What happened. */
  title: string;
  /** What to do next. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Says what happened and what to do next. Errors are announced to screen readers. */
export function Notice({ tone = 'info', title, message, actionLabel, onAction, testID }: NoticeProps) {
  const { colors } = useTheme();
  const palette =
    tone === 'error'
      ? { background: colors.danger, text: colors.onDanger }
      : { background: colors.noticeBackground, text: colors.noticeText };
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      {...(testID === undefined ? {} : { testID })}
      style={[styles.box, { backgroundColor: palette.background }]}
    >
      <AppText variant="bodyStrong" style={{ color: palette.text }}>
        {title}
      </AppText>
      {message ? <AppText style={{ color: palette.text }}>{message}</AppText> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radii.md, padding: spacing.lg, gap: spacing.xs },
  action: { marginTop: spacing.sm, alignSelf: 'flex-start' },
});
