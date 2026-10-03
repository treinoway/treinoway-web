import { useState, useEffect } from 'react';

/**
 * Re-renders the caller every `intervalMs` while enabled (pass null/0 to pause).
 * Returns the tick count so callers can depend on it if needed.
 */
const useIntervalTick = (intervalMs) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!intervalMs) return undefined;
    const intervalId = setInterval(() => setTick((prev) => prev + 1), intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return tick;
};

export default useIntervalTick;
