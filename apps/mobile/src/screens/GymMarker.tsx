import { StyleSheet, View } from 'react-native';
import type { Manufacturer } from '@boardclimb/domain';
import { ManufacturerMark } from './ManufacturerMark';

interface GymMarkerProps {
  manufacturers: readonly Manufacturer[];
  selected: boolean;
}

/** A gym on the map: its boards' marks (K, M, T), overlapped when it has several. The selected gym is larger. */
export function GymMarker({ manufacturers, selected }: GymMarkerProps) {
  const size = selected ? 38 : 28;
  return (
    <View style={styles.row}>
      {manufacturers.map((manufacturer, index) => (
        <View
          key={manufacturer}
          style={[
            styles.frame,
            { borderRadius: size * 0.3 + 2, marginLeft: index === 0 ? 0 : -size * 0.35, zIndex: -index },
            selected && styles.selected,
          ]}
        >
          <ManufacturerMark manufacturer={manufacturer} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 4 },
  frame: {
    padding: 2,
    backgroundColor: '#151618',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  selected: { backgroundColor: '#FFFFFF' },
});
