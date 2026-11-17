import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

interface GradientBackdropProps {
  /** Start (top-left) and end (bottom-right) colours. */
  from: string;
  to: string;
  /** A soft light bloom near the top, as on printed posters. */
  glow?: boolean;
  /** Fades the field into this colour towards the bottom, for a glow that melts into the page. */
  fadeTo?: string;
  style?: StyleProp<ViewStyle>;
}

/** A full-bleed colour field behind hero content. Purely decorative. */
export function GradientBackdrop({ from, to, glow = true, fadeTo, style }: GradientBackdropProps) {
  // Gradient ids are document-global on the web; each backdrop needs its own.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, style]}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`field${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
          <RadialGradient id={`glow${id}`} cx="22" cy="8" r="70" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
          {fadeTo ? (
            <LinearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fadeTo} stopOpacity="0" />
              <Stop offset="1" stopColor={fadeTo} stopOpacity="1" />
            </LinearGradient>
          ) : null}
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill={`url(#field${id})`} />
        {glow ? <Rect x="0" y="0" width="100" height="100" fill={`url(#glow${id})`} /> : null}
        {fadeTo ? <Rect x="0" y="0" width="100" height="100" fill={`url(#fade${id})`} /> : null}
      </Svg>
    </View>
  );
}
