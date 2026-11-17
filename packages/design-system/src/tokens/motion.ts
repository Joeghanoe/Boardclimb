import { Easing } from 'react-native';

/** Short and decelerating: things arrive quickly and settle, nothing bounces. */
export const motion = {
  screen: 240,
  content: 200,
  quick: 140,
  easing: Easing.out(Easing.cubic),
} as const;
