/**
 * Runs transactions one at a time on a single connection. A driver whose transactions cannot overlap (expo-sqlite
 * fails with "cannot start a transaction within a transaction") wraps its own transaction call in `run`. A failed
 * transaction rejects its caller only; the next one still runs.
 */
export class TransactionQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(transaction: () => Promise<T>): Promise<T> {
    const next = this.tail.then(transaction, transaction);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
