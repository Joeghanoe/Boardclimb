import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { BoardConfiguration } from '@boardclimb/domain';
import { AppText, Button, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import { groupConfigurations } from './presentation/groupConfigurations';

interface ConfigurationSheetProps {
  visible: boolean;
  /** The board being configured, for example "Kilter Board Homewall". */
  title: string;
  configurations: readonly BoardConfiguration[];
  selectedId: string | null;
  onChoose: (configuration: BoardConfiguration) => void;
  onClose: () => void;
}

const ANGLE_COLUMNS = 5;

/**
 * The printed layout and size, then its wall angle, in a sheet over the screen. Nothing behind it resizes, and
 * inside it the layouts scroll above a fixed angle grid, so picking a layout never moves the angles.
 */
export function ConfigurationSheet({
  visible,
  title,
  configurations,
  selectedId,
  onChoose,
  onClose,
}: ConfigurationSheetProps) {
  const { colors } = useTheme();
  const groups = useMemo(() => groupConfigurations(configurations), [configurations]);
  const startingKey = useMemo(
    () =>
      groups.find((group) => group.configurations.some((c) => c.id === selectedId))?.key ??
      groups[0]?.key ??
      null,
    [groups, selectedId],
  );
  const [activeKey, setActiveKey] = useState(startingKey);
  useEffect(() => {
    if (visible) setActiveKey(startingKey);
  }, [visible, startingKey]);

  const active = groups.find((group) => group.key === activeKey) ?? groups[0];
  const several = groups.length > 1;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close board choices"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          style={[
            styles.sheet,
            several && styles.tallSheet,
            { backgroundColor: colors.background, borderColor: colors.divider },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <AppText variant="title" numberOfLines={1} style={styles.title} accessibilityRole="header">
              {title}
            </AppText>
            <Button label="Done" variant="secondary" onPress={onClose} />
          </View>

          {several ? (
            <ScrollView style={styles.layouts} contentContainerStyle={styles.layoutsContent}>
              <AppText variant="caption" tone="muted" style={styles.eyebrow}>
                LAYOUT
              </AppText>
              {groups.map((group) => {
                const isActive = group.key === active?.key;
                const chosen = group.configurations.find((c) => c.id === selectedId);
                return (
                  <Pressable
                    key={group.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.label}${chosen ? `, current ${chosen.angleDegrees}°` : ''}`}
                    {...(Platform.OS === 'web' ? { 'aria-pressed': isActive } : {})}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setActiveKey(group.key)}
                    style={({ pressed }) => [
                      styles.layoutRow,
                      { backgroundColor: isActive ? colors.surfaceMuted : 'transparent' },
                      pressed && styles.pressed,
                    ]}
                  >
                    <AppText variant="label" style={styles.layoutName} numberOfLines={2}>
                      {group.label}
                    </AppText>
                    {chosen ? (
                      <AppText variant="caption" tone="muted">
                        {chosen.angleDegrees === null ? 'Fixed' : `${chosen.angleDegrees}°`}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={[styles.angles, { borderTopColor: colors.divider }]}>
            <AppText variant="caption" tone="muted" style={styles.eyebrow}>
              {several && active ? `ANGLE · ${active.label}` : 'ANGLE'}
            </AppText>
            <View style={styles.grid}>
              {active?.configurations.map((configuration) => {
                const isSelected = configuration.id === selectedId;
                const label =
                  configuration.angleDegrees === null ? 'Fixed' : `${configuration.angleDegrees}°`;
                return (
                  <View key={configuration.id} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Angle ${label}`}
                      {...(Platform.OS === 'web' ? { 'aria-pressed': isSelected } : {})}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => onChoose(configuration)}
                      style={({ pressed }) => [
                        styles.angle,
                        { backgroundColor: isSelected ? colors.text : colors.surfaceMuted },
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText
                        variant="bodyStrong"
                        style={{ color: isSelected ? colors.background : colors.text }}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  backdrop: { flex: 1 },
  sheet: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    maxHeight: '85%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  /** A fixed height whenever there is a list above the angles, so choosing a layout never resizes the sheet. */
  tallSheet: { height: '85%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget,
  },
  title: { flex: 1 },
  eyebrow: { fontWeight: '800', letterSpacing: 1.1, fontSize: 11 },
  layouts: { flex: 1 },
  layoutsContent: { padding: spacing.lg, gap: spacing.xs },
  layoutRow: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  layoutName: { flex: 1 },
  angles: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { width: `${100 / ANGLE_COLUMNS}%`, padding: spacing.xs },
  angle: {
    minHeight: touchTarget + 4,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
