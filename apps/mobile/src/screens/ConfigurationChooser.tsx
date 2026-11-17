import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BoardConfiguration } from '@boardclimb/domain';
import { AppText, Icon, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';

interface ConfigurationChooserProps {
  configurations: readonly BoardConfiguration[];
  selectedId: string | null;
  onChoose: (configuration: BoardConfiguration) => void;
}

/** The printed layout and size, then its wall angle. Choosing an angle chooses the configuration. */
export function ConfigurationChooser({ configurations, selectedId, onChoose }: ConfigurationChooserProps) {
  const { colors } = useTheme();
  const names = [...new Set(configurations.map((c) => c.name))];
  const selectedConfig = configurations.find((c) => c.id === selectedId);
  const [activeName, setActiveName] = useState<string | null>(
    () => selectedConfig?.name ?? (names.length === 1 && names[0] ? names[0] : null),
  );

  useEffect(() => {
    const match = configurations.find((c) => c.id === selectedId);
    if (match) setActiveName(match.name);
  }, [selectedId, configurations]);

  return (
    <View style={styles.container}>
      {names.map((option, index) => {
        const variants = configurations.filter((c) => c.name === option);
        const isExpanded = activeName === option;
        const angles = variants
          .map((c) => c.angleDegrees)
          .filter((a): a is number => a !== null)
          .sort((a, b) => a - b);
        const summary =
          angles.length === 0
            ? 'Fixed angle'
            : angles.length === 1
              ? `${angles[0]}°`
              : `${angles.length} angles, ${angles[0]}°–${angles[angles.length - 1]}°`;
        return (
          <View
            key={option}
            style={[
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${option}, ${summary}`}
              accessibilityState={{ expanded: isExpanded }}
              onPress={() => setActiveName(isExpanded && names.length > 1 ? null : option)}
              style={({ pressed }) => [styles.layoutRow, pressed && styles.pressed]}
            >
              <View style={styles.layoutInfo}>
                <AppText variant="label">{option}</AppText>
                <AppText variant="caption" tone="muted">
                  {summary}
                </AppText>
              </View>
              <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
                <Icon name="chevronDown" color={colors.textMuted} size={18} />
              </View>
            </Pressable>
            {isExpanded ? (
              <View style={styles.angles}>
                {variants.map((c) => {
                  const isSelected = selectedId === c.id;
                  const label = c.angleDegrees === null ? 'Fixed' : `${c.angleDegrees}°`;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Angle ${label}`}
                      {...(Platform.OS === 'web' ? { 'aria-pressed': isSelected } : {})}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onChoose(c)}
                      style={({ pressed }) => [
                        styles.angle,
                        { backgroundColor: isSelected ? colors.text : colors.surfaceMuted },
                        pressed && styles.pressed,
                      ]}
                    >
                      {isSelected ? (
                        <Icon name="check" color={colors.background} size={16} weight={2.6} />
                      ) : null}
                      <AppText
                        variant="title"
                        style={{ color: isSelected ? colors.background : colors.text }}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  layoutRow: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  layoutInfo: { flex: 1, gap: 2 },
  angles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  angle: {
    minHeight: touchTarget + 4,
    minWidth: 72,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
