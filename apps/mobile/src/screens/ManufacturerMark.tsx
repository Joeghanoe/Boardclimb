import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText, BLOCKS } from '@boardclimb/design-system';
import type { Manufacturer } from '@boardclimb/domain';
import { describeManufacturer } from './presentation/describeManufacturer';
import { manufacturerBlocks } from './presentation/manufacturerBlocks';

interface ManufacturerMarkProps {
  manufacturer: Manufacturer;
  size?: number;
}

/**
 * The app's own mark for a manufacturer: its fixed colour pair as a glossy tile with a heavy initial (K, M, T).
 * Original artwork; manufacturers' logos are trademarks and are not reused (docs/licensing-inventory.md).
 * Decorative: the name is always written or spoken next to it.
 */
export function ManufacturerMark({ manufacturer, size = 36 }: ManufacturerMarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pair = manufacturerBlocks(manufacturer);
  const from = BLOCKS[pair.from];
  const to = BLOCKS[pair.to];
  const radius = size * 0.3;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mark, { width: size, height: size, borderRadius: radius }]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`tile${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from.bg} />
            <Stop offset="1" stopColor={to.bg} />
          </LinearGradient>
          <LinearGradient id={`gloss${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} rx={radius} fill={`url(#tile${id})`} />
        <Rect x="0" y="0" width={size} height={size * 0.5} rx={radius} fill={`url(#gloss${id})`} />
        <Rect
          x="0.5"
          y="0.5"
          width={size - 1}
          height={size - 1}
          rx={radius - 0.5}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      </Svg>
      <AppText
        variant="hero"
        style={[styles.letter, { color: from.on, fontSize: size * 0.56, lineHeight: size * 0.7 }]}
      >
        {describeManufacturer(manufacturer).charAt(0)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { textAlign: 'center', letterSpacing: 0 },
});
