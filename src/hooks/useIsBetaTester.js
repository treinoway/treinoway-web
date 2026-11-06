import { useAuth } from '../contexts/AuthContext';

// True for trainers on the BETA platform tier (the audience of the feedback widget).
const useIsBetaTester = () => {
  const { user, hasRole } = useAuth();
  return hasRole('TRAINER') && user?.platformPlan?.tier === 'BETA';
};

export default useIsBetaTester;
