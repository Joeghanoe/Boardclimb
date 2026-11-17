import type { BoardErrorCode } from '@boardclimb/application';
import type { Guidance } from './Guidance';

/** Exhaustive over the board codes: adding a code without wording fails type-checking. */
const WORDING: Record<BoardErrorCode, Guidance> = {
  bluetooth_permission_denied: {
    title: 'Bluetooth permission is off',
    action:
      'Allow Bluetooth for this app in your phone settings, then scan again. Browsing and logging still work.',
  },
  bluetooth_disabled: {
    title: 'Bluetooth is turned off',
    action: 'Turn Bluetooth on, then scan again.',
  },
  board_not_found: {
    title: 'No board found nearby',
    action: 'Stand close to the board, check that it is powered on, then scan again.',
  },
  scan_failed: {
    title: 'Scanning did not work',
    action: 'Try again. If it keeps failing, turn Bluetooth off and on.',
  },
  connection_failed: {
    title: 'Could not connect to the board',
    action: 'Move closer and try again. Another phone may be holding the connection.',
  },
  connection_timeout: {
    title: 'The board did not answer',
    action: 'Move closer and try again.',
  },
  takeover_unsupported: {
    title: 'Another phone is connected to this board',
    action: 'This board talks to one phone at a time. Disconnect the other phone, then try again.',
  },
  unsupported_configuration: {
    title: 'This board layout is not supported',
    action: 'Pick a different layout for this board.',
  },
  command_rejected: {
    title: 'The board refused this problem',
    action: 'Check that the layout matches your board, then tap Light up again.',
  },
  not_connected: {
    title: 'No board connected',
    action: 'Connect to your board, then tap Light up.',
  },
  protocol_unverified: {
    title: 'Lighting this board is not available yet',
    action: 'Control of this board is not built yet. You can still browse and log.',
  },
};

export function describeBoardError(code: BoardErrorCode): Guidance {
  return WORDING[code];
}
