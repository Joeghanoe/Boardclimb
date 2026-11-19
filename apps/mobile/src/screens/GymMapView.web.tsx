import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { AppText, radii, spacing, touchTarget, useTheme } from '@boardclimb/design-system';
import { gymManufacturers } from '@boardclimb/domain';
import type { GymMapViewProps } from './GymMapViewProps';
import { GymMarker } from './GymMarker';
import { describeGymPlace } from './presentation/describeGymPlace';

/**
 * Browser preview: native maps do not run on the web, so the same gyms are a list, nearest to the
 * current centre first. Location is not offered here.
 */
export function GymMapView({ matches, selectedId, onSelect }: GymMapViewProps) {
  const { colors } = useTheme();
  return (
    <FlatList
      data={matches}
      keyExtractor={({ gym }) => gym.id}
      contentContainerStyle={styles.list}
      renderItem={({ item: { gym } }) => {
        const selected = gym.id === selectedId;
        const place = describeGymPlace(gym);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={place ? `${gym.name}, ${place}` : gym.name}
            onPress={() => onSelect(gym)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: selected ? colors.surfaceMuted : colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <GymMarker manufacturers={gymManufacturers(gym)} selected={false} />
            <View style={styles.text}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {gym.name}
              </AppText>
              {place ? (
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {place}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    // The header's 720-point column plus this list's own side padding, so rows line up with the search box.
    maxWidth: 720 + spacing.lg * 2,
    alignSelf: 'center',
    padding: spacing.lg,
    // Clears the search and pills that float over the list.
    paddingTop: 150,
    gap: spacing.sm,
    paddingBottom: 240,
  },
  row: {
    minHeight: touchTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  text: { flex: 1, gap: 2 },
  pressed: { opacity: 0.8 },
});
