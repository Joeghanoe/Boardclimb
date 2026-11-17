import type { IconName } from './IconName';

/** Original line drawings, 24-point grid, stroked (not filled). */
export const ICON_PATHS: Record<IconName, string[]> = {
  back: ['M15 5l-7 7 7 7'],
  chevronRight: ['M9 5l7 7-7 7'],
  chevronDown: ['M5 9l7 7 7-7'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M4.5 12.5l5 5 10-11'],
  bolt: ['M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z'],
  bulb: ['M9.5 20h5', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 7.5v.01'],
  sliders: ['M4 7h10', 'M18 7h2', 'M16 5v4', 'M4 17h4', 'M12 17h8', 'M10 15v4'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  board: ['M5 3h14v18H5z', 'M9 7.5v.01', 'M15 7.5v.01', 'M12 12v.01', 'M9 16.5v.01', 'M15 16.5v.01'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  arrowUpRight: ['M7 17L17 7', 'M8 7h9v9'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  swap: ['M7 4L4 7l3 3', 'M4 7h13', 'M17 20l3-3-3-3', 'M20 17H7'],
};
