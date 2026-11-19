import { describe, expect, it } from 'bun:test';
import { TransactionQueue } from '@boardclimb/storage-local';

describe('TransactionQueue (problem details saved while neighbours load)', () => {
  it('never lets two transactions overlap, and runs them in the order asked', async () => {
    const queue = new TransactionQueue();
    const log: string[] = [];
    let open = 0;
    const transaction = (name: string, ms: number) => async () => {
      open += 1;
      expect(open).toBe(1);
      log.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, ms));
      log.push(`end ${name}`);
      open -= 1;
      return name;
    };
    const results = await Promise.all([
      queue.run(transaction('a', 15)),
      queue.run(transaction('b', 1)),
      queue.run(transaction('c', 5)),
    ]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('fails only the transaction that failed; the next one still runs', async () => {
    const queue = new TransactionQueue();
    const failed = queue.run(() => Promise.reject(new Error('disk full')));
    const next = queue.run(() => Promise.resolve('saved'));
    await expect(failed).rejects.toThrow('disk full');
    expect(await next).toBe('saved');
  });
});
