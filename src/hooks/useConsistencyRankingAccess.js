import { useAuth } from '../contexts/AuthContext';
import { isConsistencyRankingVisible } from '../utils/featureAccess';

const ADMIN_ROLE = 'admin';

// Whether the current user may see the Ranking de Constância on the current hostname and build.
const useConsistencyRankingAccess = () => {
  const { hasRole } = useAuth();
  return isConsistencyRankingVisible({
    hostname: window.location.hostname,
    isDev: import.meta.env.DEV,
    isAdmin: hasRole(ADMIN_ROLE),
  });
};

export default useConsistencyRankingAccess;
