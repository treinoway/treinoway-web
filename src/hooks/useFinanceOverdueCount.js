import { useEffect, useState } from 'react';
import useTrainerDashboard from './useTrainerDashboard';
import { useAuth } from '../contexts/AuthContext';
import { FINANCE_OVERDUE_EVENT } from '../constants/finance';
import {
  getBroadcastOverdueCount,
  getSummaryOverdueCount,
  loadSummaryOverdueCount,
  setBroadcastOverdueCount,
} from '../utils/financeSummaryCache';

/**
 * Overdue-charges count for the sidebar badge of any professional. Priority: a
 * count broadcast by Financeiro (trainer-only: only while mounted), then (trainer-only) the cached trainer
 * dashboard, then `GET /professional/finance/summary` (requested once per user
 * object, the only source for nutritionist-only users), then the dashboard cache.
 */
const useFinanceOverdueCount = () => {
  const { user, hasRole } = useAuth();
  const { data } = useTrainerDashboard(false);
  const isTrainer = Boolean(hasRole('TRAINER'));
  const isProfessional = isTrainer || Boolean(hasRole('NUTRITIONIST'));
  const isTrainerOnly = isTrainer && !hasRole('NUTRITIONIST');
  // why: trainer-only mounts start from the dashboard cache; a stored broadcast would outlive it
  const [broadcastCount, setBroadcastCount] = useState(() => (isTrainerOnly ? null : getBroadcastOverdueCount(user)));
  const [summaryCount, setSummaryCount] = useState(() => getSummaryOverdueCount(user));

  useEffect(() => {
    const handleChange = (event) => {
      const count = event.detail?.overdueCount;
      if (typeof count !== 'number') return;
      setBroadcastOverdueCount(user, count);
      setBroadcastCount(count);
    };
    window.addEventListener(FINANCE_OVERDUE_EVENT, handleChange);
    return () => window.removeEventListener(FINANCE_OVERDUE_EVENT, handleChange);
  }, [user]);

  useEffect(() => {
    if (!isProfessional || !user) return undefined;
    let cancelled = false;
    loadSummaryOverdueCount(user).then((count) => {
      if (!cancelled && count !== null) setSummaryCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [isProfessional, user]);

  const dashboardCount = data?.finance?.overdueCount ?? null;
  const baseCount = isTrainerOnly ? (dashboardCount ?? summaryCount) : (summaryCount ?? dashboardCount);
  return broadcastCount ?? baseCount ?? 0;
};

export default useFinanceOverdueCount;
