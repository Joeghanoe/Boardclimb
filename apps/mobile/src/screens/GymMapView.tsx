import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import type { GymMapFocus } from './GymMapFocus';
import type { GymMapViewProps } from './GymMapViewProps';
import { GymMapPin } from './GymMapPin';

function regionFor(focus: GymMapFocus) {
  return {
    latitude: focus.point.latitude,
    longitude: focus.point.longitude,
    latitudeDelta: focus.span,
    longitudeDelta: focus.span,
  };
}

/** The native map: Apple Maps on iOS, Google Maps on Android. Draws only the gyms it is given. */
export function GymMapView({
  matches,
  selectedId,
  initial,
  focus,
  showUser,
  onSelect,
  onCenterChange,
  onUserLocation,
  onLocationDenied,
}: GymMapViewProps) {
  const map = useRef<MapView>(null);
  const [permitted, setPermitted] = useState(false);

  useEffect(() => {
    if (focus) map.current?.animateToRegion(regionFor(focus), 450);
  }, [focus]);

  // Ask, then read one position. The map's own location events report 0,0 until it is allowed, so they are
  // only listened to after permission.
  useEffect(() => {
    if (!showUser) return;
    let current = true;
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!current) return;
      if (!granted) {
        onLocationDenied();
        return;
      }
      setPermitted(true);
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (current)
        onUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    })().catch(() => {
      if (current) onLocationDenied();
    });
    return () => {
      current = false;
    };
  }, [showUser, onUserLocation, onLocationDenied]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={regionFor(initial)}
      showsUserLocation={showUser && permitted}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onRegionChangeComplete={(region) =>
        onCenterChange({ latitude: region.latitude, longitude: region.longitude })
      }
      onUserLocationChange={(event) => {
        const coordinate = event.nativeEvent.coordinate;
        if (!permitted || !coordinate || (coordinate.latitude === 0 && coordinate.longitude === 0)) return;
        onUserLocation({ latitude: coordinate.latitude, longitude: coordinate.longitude });
      }}
    >
      {matches.map(({ gym }) => (
        <GymMapPin key={gym.id} gym={gym} selected={gym.id === selectedId} onSelect={onSelect} />
      ))}
    </MapView>
  );
}
