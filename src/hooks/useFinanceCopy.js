import { useAuth } from '../contexts/AuthContext';
import { FINANCE_AUDIENCE, ftCount, ftf, resolveFinanceAudience } from '../i18n/financeCopy';

/** Finance copy for the signed-in professional (aluno, paciente or noun-free for both roles). */
const useFinanceCopy = () => {
  const { hasRole } = useAuth();
  const audience = resolveFinanceAudience(hasRole);
  return {
    audience,
    isDualRole: audience === FINANCE_AUDIENCE.DUAL,
    ft: (path, params) => ftf(audience, path, params),
    ftCount: (path, count, params) => ftCount(audience, path, count, params),
  };
};

export default useFinanceCopy;
