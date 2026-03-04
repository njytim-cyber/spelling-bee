/**
 * hooks/useTimedState.ts
 *
 * Provides a state value that auto-resets after a timeout.
 * Replaces the repeated pattern of:
 *   const [x, setX] = useState(false);
 *   // later: setX(true); setTimeout(() => setX(false), 3000);
 */
import { useState, useRef, useCallback } from 'react';

/** Boolean timed state — flashes true, auto-resets to false. */
export function useTimedFlag(ms: number): [boolean, () => void] {
  const [value, setValue] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setValue(true);
    timerRef.current = setTimeout(() => setValue(false), ms);
  }, [ms]);

  return [value, fire];
}

/** String timed state — flashes a message, auto-resets to ''. */
export function useTimedMessage(ms: number): [string, (msg: string) => void] {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setValue(msg);
    timerRef.current = setTimeout(() => setValue(''), ms);
  }, [ms]);

  return [value, fire];
}
