import { useEffect, useState } from 'react';

/** True only once `flag` has stayed true for `delayMs`; false again as soon as it turns false. */
export function useDelayedFlag(flag: boolean, delayMs: number): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!flag) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [flag, delayMs]);
  return shown;
}
