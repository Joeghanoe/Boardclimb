import { useEffect, useState } from 'react';
import { Marker } from 'react-native-maps';
import { gymManufacturers } from '@boardclimb/domain';
import type { Gym } from '@boardclimb/domain';
import { GymMarker } from './GymMarker';

interface GymMapPinProps {
  gym: Gym;
  selected: boolean;
  onSelect: (gym: Gym) => void;
}

/** How long a new pin keeps redrawing, so its drawn mark is captured before the map freezes it for speed. */
const SETTLE_MS = 600;

/** One gym on the native map. */
export function GymMapPin({ gym, selected, onSelect }: GymMapPinProps) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [selected]);
  return (
    <Marker
      identifier={gym.id}
      coordinate={{ latitude: gym.latitude, longitude: gym.longitude }}
      tracksViewChanges={!settled}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 2 : 1}
      accessibilityLabel={gym.name}
      onPress={(event) => {
        event.stopPropagation();
        onSelect(gym);
      }}
    >
      <GymMarker manufacturers={gymManufacturers(gym)} selected={selected} />
    </Marker>
  );
}
