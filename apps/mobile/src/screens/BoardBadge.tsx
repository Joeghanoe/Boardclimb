import { Pressable, StyleSheet } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { AppText, BLOCKS, touchTarget } from '@boardclimb/design-system';
import { describeLayoutDetail } from './presentation/describeLayoutDetail';
import { describeManufacturer } from './presentation/describeManufacturer';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface BoardBadgeProps {
  selection: BoardSelection | null;
  onPress: () => void;
}

/** Which board the list is for, at a glance: the board's own colour and initial (K, M, T). Opens the layout choice. */
export function BoardBadge({ selection, onPress }: BoardBadgeProps) {
  const manufacturer = selection?.configuration.manufacturer ?? null;
  const block = BLOCKS[manufacturerBlocks(manufacturer).from];
  const name = manufacturer ? describeManufacturer(manufacturer) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        selection
          ? `${selection.boardName}, ${describeLayoutDetail(selection.boardName, selection.configuration.name, selection.configuration.angleDegrees)}. Change board`
          : 'Choose board'
      }
      onPress={onPress}
      style={({ pressed }) => [styles.badge, { backgroundColor: block.bg }, pressed && styles.pressed]}
    >
      <AppText variant="title" style={[styles.letter, { color: block.on }]}>
        {name ? name.charAt(0) : '?'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 20, lineHeight: 24 },
  pressed: { opacity: 0.75 },
});
