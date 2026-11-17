import { StyleSheet, View } from 'react-native';
import type { Problem } from '@boardclimb/domain';
import { AppText, Card, spacing, useTheme } from '@boardclimb/design-system';

interface BoardMapProps {
  problem: Problem;
}

/** Original coordinate drawing. No manufacturer art; role letters keep it readable without colour. */
export function BoardMap({ problem }: BoardMapProps) {
  const { colors } = useTheme();
  const { bounds, holds } = problem;
  if (!bounds || holds.some((h) => h.x === undefined || h.y === undefined)) return null;
  const width = bounds.right - bounds.left,
    height = bounds.top - bounds.bottom;
  const letters: Record<string, string> = { start: 'S', hand: 'H', foot: 'F', finish: 'T' };
  return (
    <Card>
      <AppText variant="bodyStrong">Hold map</AppText>
      <View
        accessible
        accessibilityLabel={`Hold map, bottom at bottom. ${holds.length} holds. Start S, hand H, foot F, finish T.`}
        style={[
          styles.map,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.controlBorder,
            aspectRatio: width / height,
            maxWidth: (430 * width) / height,
            alignSelf: 'center',
          },
        ]}
      >
        {holds.map((h, i) => (
          <View
            key={`${h.holdId}-${i}`}
            style={[
              styles.hold,
              {
                left: `${5 + (90 * (h.x! - bounds.left)) / width}%`,
                top: `${5 + (90 * (bounds.top - h.y!)) / height}%`,
                backgroundColor:
                  h.role === 'start' ? colors.success : h.role === 'finish' ? colors.primary : colors.surface,
                borderColor: colors.text,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color:
                  h.role === 'start'
                    ? colors.onSuccess
                    : h.role === 'finish'
                      ? colors.onPrimary
                      : colors.text,
              }}
            >
              {letters[h.role]}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="muted">
        S Start · H Hand · F Foot · T Finish
      </AppText>
    </Card>
  );
}
const styles = StyleSheet.create({
  map: { width: '100%', maxHeight: 430, borderWidth: 1, borderRadius: 8, marginVertical: spacing.sm },
  hold: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
});
