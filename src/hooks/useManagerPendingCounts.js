import { useEffect, useState } from 'react';
import { getPending } from '../manager/api';

const NO_PENDING = { pendingInvites: 0, newFeedbacks: 0 };

// Keeps a count only when the service answered a number; anything else counts as zero.
const toCount = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// Pending counts of the service, or null when the request fails.
const loadPendingCounts = async () => {
  try {
    const pending = await getPending();
    return { pendingInvites: toCount(pending?.pendingInvites), newFeedbacks: toCount(pending?.newFeedbacks) };
  } catch {
    // why: the counts are a navigation hint; a failure keeps the links without badges instead of bothering the admin
    return null;
  }
};

// Pending beta invites and new feedbacks for the admin navigation badges, asked while `enabled` and again on each new `refreshKey`.
const useManagerPendingCounts = (enabled, refreshKey = null) => {
  const [counts, setCounts] = useState(NO_PENDING);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadPendingCounts().then((loaded) => {
      if (!cancelled && loaded) setCounts(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  return enabled ? counts : NO_PENDING;
};

export default useManagerPendingCounts;
