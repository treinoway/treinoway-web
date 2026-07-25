import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useBetaGate from '../hooks/useBetaGate';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const blocked = useBetaGate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (blocked) {
    return <Navigate to="/invite" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
