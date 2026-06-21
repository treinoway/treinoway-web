import { useState, useEffect, useRef } from 'react';

/**
 * Returns a boolean that mirrors `active`, but with a rising edge delayed by
 * `delayMs`. The falling edge is instant.
 *
 * Use case: loading spinners that should only appear when a fetch has been
 * in flight for longer than the threshold, so fast responses produce no flash.
 *
 * Implementation note: `thresholdReached` is the internal timer-driven flag.
 * The public value is `active && thresholdReached` — when `active` becomes
 * false the result drops to false in the same render cycle without needing a
 * synchronous setState inside the effect (which would violate the
 * react-hooks/set-state-in-effect rule).
 *
 * @param {boolean} active  The raw boolean to delay (e.g. `loading`, `searching`).
 * @param {number}  delayMs Milliseconds before the returned flag turns true.
 * @returns {boolean}
 */
const useDelayedFlag = (active, delayMs) => {
  const [thresholdReached, setThresholdReached] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) {
      timerRef.current = setTimeout(() => {
        setThresholdReached(true);
      }, delayMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Reset via timer (0 ms) to avoid synchronous setState inside effect.
      timerRef.current = setTimeout(() => {
        setThresholdReached(false);
      }, 0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, delayMs]);

  // Derive the public flag: only true when BOTH active and the threshold has fired.
  // This ensures an instant falling edge even before the 0ms reset timer fires.
  return active && thresholdReached;
};

export default useDelayedFlag;
