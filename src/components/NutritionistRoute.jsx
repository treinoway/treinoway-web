import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useEffect, useRef } from 'react';

const NutritionistRoute = ({ children }) => {
  const { isAuthenticated, hasRole } = useAuth();
  const { showToast } = useToast();
  const toastShownRef = useRef(false);

  const isNutritionist = hasRole('NUTRITIONIST');

  useEffect(() => {
    if (isAuthenticated && !isNutritionist && !toastShownRef.current) {
      toastShownRef.current = true;
      showToast('Este perfil não está ativo. Ative em Painel → Seja um Nutricionista.', 'error');
    }
  }, [isAuthenticated, isNutritionist, showToast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isNutritionist) {
    return <Navigate to="/" replace />;
  }

  return children;
};

NutritionistRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NutritionistRoute;
