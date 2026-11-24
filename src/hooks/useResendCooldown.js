import { useCallback, useEffect, useState } from 'react';
import { useCooldownDeadlineState, useSharedResendCooldown } from '../contexts/ResendCooldownContext';

const TICK_MS = 1000;

// Counts down a resend cooldown for one owner (user id); inside ResendCooldownProvider the deadline is shared and survives remounts.
const useResendCooldown = (seconds, ownerId = null) => {
  const sharedState = useSharedResendCooldown();
  const localState = useCooldownDeadlineState();
  const [cooldown, setCooldown] = sharedState ?? localState;
  const [now, setNow] = useState(() => Date.now());
  const deadline = cooldown.ownerId === ownerId ? cooldown.deadline : 0;
  const remainingSeconds = Math.max(0, Math.ceil((deadline - now) / TICK_MS));
  const isCoolingDown = remainingSeconds > 0;

  useEffect(() => {
    if (!isCoolingDown) return undefined;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [isCoolingDown]);

  const startCooldown = useCallback((overrideSeconds) => {
    const startedAt = Date.now();
    const duration = overrideSeconds > 0 ? overrideSeconds : seconds;
    setNow(startedAt);
    setCooldown({ ownerId, deadline: startedAt + duration * TICK_MS });
  }, [seconds, ownerId, setCooldown]);

  return { remainingSeconds, isCoolingDown, startCooldown };
};

export default useResendCooldown;
