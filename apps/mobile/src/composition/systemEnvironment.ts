import type { Clock, IdGenerator } from '@boardclimb/application';

/** The real clock and zone of the phone. Ambient time lives only in the composition root (T.2). */
export const systemClock: Clock = {
  now: () => new Date(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

/** Unique, not secret: time plus randomness is enough for client-generated log event ids. */
export const randomIds: IdGenerator = {
  next: () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`,
};
