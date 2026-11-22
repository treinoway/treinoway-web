import { useAuth } from '../contexts/AuthContext';
import { isStudentFeedbackVisible } from '../utils/featureAccess';

const ADMIN_ROLE = 'admin';

// Whether the current user may see the student feedback on the current hostname and build (no role check available counts as non-admin).
const useStudentFeedbackAccess = () => {
  const { hasRole } = useAuth();
  return isStudentFeedbackVisible({
    hostname: window.location.hostname,
    isDev: import.meta.env.DEV,
    isAdmin: hasRole?.(ADMIN_ROLE),
  });
};

export default useStudentFeedbackAccess;
