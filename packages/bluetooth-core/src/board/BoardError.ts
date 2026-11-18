import type { BoardErrorCode } from './BoardErrorCode';

/** A Bluetooth failure with a stable code. Messages are safe to show; they never carry raw BLE errors. */
export class BoardError extends Error {
  constructor(
    readonly code: BoardErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BoardError';
  }
}
