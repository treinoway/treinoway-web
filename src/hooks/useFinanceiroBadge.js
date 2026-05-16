import { useEffect, useState, useCallback, useRef } from 'react';
import {
  listAllSubscriptions,
  listPaymentsForSubscription,
} from '../api/subscriptions';
import { deriveEffectivePaymentStatus, PAYMENT_STATUS } from '../utils/subscriptionHelpers';

const countPendingAndOverdue = async () => {
  const subscriptions = await listAllSubscriptions({ status: 'active' });
  let total = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const payments = await listPaymentsForSubscription(subscription.id);
        payments.forEach((payment) => {
          const status = deriveEffectivePaymentStatus(payment);
          if (status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.OVERDUE) {
            total += 1;
          }
        });
      } catch {
        // ignore — badge should never break the layout
      }
    }),
  );
  return total;
};

/**
 * Computes the sidebar badge count: total pending + overdue payments across
 * all active subscriptions, ignoring the month filter. Returns 0 when there
 * is nothing to nudge the trainer about.
 *
 * The hook is intentionally light: it fetches on mount and exposes a refresh
 * function. The Financeiro page itself owns realtime updates within its
 * session; this hook is for the persistent sidebar badge.
 */
const useFinanceiroBadge = ({ enabled = true } = {}) => {
  const [count, setCount] = useState(0);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const total = await countPendingAndOverdue();
      if (!cancelledRef.current) setCount(total);
    } catch {
      // ignore — badge should never break the layout
    }
  }, [enabled]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) return undefined;
    // The async refresh resolves outside the synchronous effect body,
    // so the setState call cannot trigger a cascading render. The eslint
    // rule is conservative here — same pattern used in useOnboardingStatus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, refresh]);

  return { count, refresh };
};

export default useFinanceiroBadge;
