import { useEffect, useState } from 'react';
import useTrainerDashboard from './useTrainerDashboard';
import { FINANCE_OVERDUE_EVENT } from '../constants/finance';

/**
 * Overdue-charges count for the sidebar badge, without any network request:
 * starts from the cached dashboard payload (`useTrainerDashboard(false)` reads
 * the cache only) and follows live updates broadcast by Financeiro.
 */
const useFinanceOverdueCount = () => {
  const { data } = useTrainerDashboard(false);
  const [liveCount, setLiveCount] = useState(null);

  useEffect(() => {
    const handleChange = (event) => {
      const count = event.detail?.overdueCount;
      if (typeof count === 'number') setLiveCount(count);
    };
    window.addEventListener(FINANCE_OVERDUE_EVENT, handleChange);
    return () => window.removeEventListener(FINANCE_OVERDUE_EVENT, handleChange);
  }, []);

  return liveCount ?? data?.finance?.overdueCount ?? 0;
};

export default useFinanceOverdueCount;
