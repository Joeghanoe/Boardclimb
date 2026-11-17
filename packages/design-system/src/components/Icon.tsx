import Svg, { Path } from 'react-native-svg';
import { ICON_PATHS } from './ICON_PATHS';
import type { IconName } from './IconName';

interface IconProps {
  name: IconName;
  color: string;
  size?: number;
  /** Stroke weight on the 24-point grid. */
  weight?: number;
}

/** A line icon drawn for this app on a 24-point grid. Decorative: the control around it carries the label. */
export function Icon({ name, color, size = 22, weight = 2.2 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ICON_PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
