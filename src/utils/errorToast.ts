/**
 * utils/errorToast.ts
 *
 * Lightweight global error toast emitter. Any module can call showErrorToast()
 * and the App-level Toast component will display it.
 */

type Listener = (msg: string) => void;

let listener: Listener | null = null;

/** Subscribe to error toast events (called once from App.tsx) */
export function onErrorToast(fn: Listener) {
  listener = fn;
  return () => { listener = null; };
}

/** Show a user-facing error toast. Safe to call from anywhere. */
export function showErrorToast(msg = 'Something went wrong') {
  listener?.(msg);
}
