import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import type { BoardConfiguration } from '@boardclimb/domain';
import { spacing } from '@boardclimb/design-system';
import type { BlockName } from '@boardclimb/design-system';
import { PickerPill } from './PickerPill';

interface AngleStripProps {
  /** One configuration per angle, lowest first. */
  configurations: readonly BoardConfiguration[];
  selectedId: string | null;
  block: BlockName;
  onSelect: (configuration: BoardConfiguration) => void;
}

const PILL_WIDTH = 68;

/** Every angle of a layout in one row that swipes sideways, so the row never changes height and the choice stays at the thumb. */
export function AngleStrip({ configurations, selectedId, block, onSelect }: AngleStripProps) {
  const scroll = useRef<ScrollViewInstance>(null);
  const index = configurations.findIndex((c) => c.id === selectedId);

  // Keep the chosen angle in view when the layout, or the angle it starts on, changes.
  useEffect(() => {
    if (index < 0) return;
    scroll.current?.scrollTo({
      x: Math.max(0, index * (PILL_WIDTH + spacing.sm) - PILL_WIDTH * 2),
      animated: true,
    });
  }, [index, configurations]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Wall angle"
    >
      {configurations.map((configuration) => {
        const label = configuration.angleDegrees === null ? 'Fixed' : `${configuration.angleDegrees}°`;
        return (
          <PickerPill
            key={configuration.id}
            label={label}
            accessibilityLabel={`Angle ${label}`}
            selected={configuration.id === selectedId}
            block={block}
            onPress={() => onSelect(configuration)}
            style={styles.pill}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: { width: PILL_WIDTH, paddingHorizontal: 0 },
});
