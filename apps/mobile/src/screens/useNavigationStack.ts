import { useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { Route } from './Route';

/** A stack of screens. The Android back button pops it; at the root the system handles back. */
export function useNavigationStack(initial: Route) {
  const [stack, setStack] = useState<Route[]>([initial]);
  const push = useCallback((route: Route) => setStack((current) => [...current, route]), []);
  const pop = useCallback(
    () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    [],
  );
  const depth = stack.length;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (depth <= 1) return false;
      pop();
      return true;
    });
    return () => subscription.remove();
  }, [depth, pop]);

  return { route: stack[depth - 1] ?? initial, push, pop };
}
