'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Like useTransition for async work: returns [pending, run]. run() ignores
 * new calls while one is already in flight (prevents double taps).
 */
export function useAsync(): [boolean, (fn: () => Promise<unknown>) => void] {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const run = useCallback((fn: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    fn()
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        busy.current = false;
        setPending(false);
      });
  }, []);
  return [pending, run];
}
