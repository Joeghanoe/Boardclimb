export const BOARD_ERROR_CODES = [
  'bluetooth_permission_denied',
  'bluetooth_disabled',
  'board_not_found',
  'scan_failed',
  'connection_failed',
  'connection_timeout',
  'takeover_unsupported',
  'unsupported_configuration',
  'command_rejected',
  'not_connected',
  'protocol_unverified',
] as const;

export type BoardErrorCode = (typeof BOARD_ERROR_CODES)[number];
