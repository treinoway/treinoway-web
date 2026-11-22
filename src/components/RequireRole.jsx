import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RequireRole = ({ roles, children }) => {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasAnyRequiredRole = roles.some((role) => hasRole(role));

  if (!hasAnyRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

RequireRole.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired,
};

export default RequireRole;
