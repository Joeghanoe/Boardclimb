import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface EdgeFadeProps {
  /** The page colour the fade starts from. */
  color: string;
  /** The screen edge the fade is solid at: 'top' fades downwards, 'bottom' fades upwards. */
  edge: 'top' | 'bottom';
}

/**
 * A fade from the page colour to clear, so floating controls read over a map or a board drawing. Fills its parent;
 * decorative.
 */
export function EdgeFade({ color, edge }: EdgeFadeProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = edge === 'top';
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1 1">
        <Defs>
          <LinearGradient id={`fade${id}`} x1="0" y1={top ? '0' : '1'} x2="0" y2={top ? '1' : '0'}>
            <Stop offset="0" stopColor={color} stopOpacity="0.92" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.55" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#fade${id})`} />
      </Svg>
    </View>
  );
}
