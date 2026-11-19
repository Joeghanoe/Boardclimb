import { Pressable, StyleSheet } from 'react-native';
import type { BoardSelection } from '@boardclimb/application';
import { BLOCKS, Icon, touchTarget } from '@boardclimb/design-system';
import { describeLayoutDetail } from './presentation/describeLayoutDetail';
import { ManufacturerMark } from './ManufacturerMark';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface BoardBadgeProps {
  selection: BoardSelection | null;
  onPress: () => void;
}

/** Which board the list is for, at a glance: the board's mark (K, M, T). Opens the layout choice. */
export function BoardBadge({ selection, onPress }: BoardBadgeProps) {
  const manufacturer = selection?.configuration.manufacturer ?? null;
  const block = BLOCKS[manufacturerBlocks(manufacturer).from];
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
      {manufacturer ? (
        <ManufacturerMark manufacturer={manufacturer} size={touchTarget} />
      ) : (
        <Icon name="select" color={block.on} size={22} weight={2.4} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: touchTarget * 0.3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
