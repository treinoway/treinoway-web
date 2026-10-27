import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useAiAccess from '../hooks/useAiAccess';

// Renders the iArnold route only for trainers whose plan allows AI; everyone else goes to the dashboard.
const AiRouteGuard = ({ children }) => {
  const { hasRole } = useAuth();
  const canUseAi = useAiAccess();

  if (!hasRole('TRAINER') || !canUseAi) return <Navigate to="/" replace />;
  return children;
};

AiRouteGuard.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AiRouteGuard;
