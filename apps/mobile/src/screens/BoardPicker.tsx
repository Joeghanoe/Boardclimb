import { Pressable, StyleSheet, View } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { AppText, BLOCKS, Icon, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import { ManufacturerMark } from './ManufacturerMark';
import { describeLayoutDetail } from './presentation/describeLayoutDetail';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface BoardPickerProps {
  selection: BoardSelection | null;
  onPress: () => void;
}

/** The board layout being climbed on, as one row that opens the layout chooser. */
export function BoardPicker({ selection, onPress }: BoardPickerProps) {
  const { colors } = useTheme();
  const blocks = manufacturerBlocks(selection ? selection.configuration.manufacturer : null);
  const angle = selection?.configuration.angleDegrees ?? null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        selection
          ? `${selection.boardName}, ${selection.configuration.name}${angle === null ? '' : `, ${angle} degrees`}. Change board layout`
          : 'Choose board layout'
      }
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surface }, pressed && styles.pressed]}
    >
      {selection ? (
        <ManufacturerMark manufacturer={selection.configuration.manufacturer} size={34} />
      ) : (
        <View style={[styles.swatch, { backgroundColor: BLOCKS[blocks.from].bg }]} />
      )}
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {selection ? selection.boardName : 'Choose board'}
        </AppText>
        {selection ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {describeLayoutDetail(selection.boardName, selection.configuration.name, angle)}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevronRight" color={colors.textMuted} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  swatch: { width: 34, height: 34, borderRadius: 10 },
  text: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
});
