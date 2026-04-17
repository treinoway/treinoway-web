import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { t } from '../../i18n';

const OnboardingAllDoneState = ({ secondaryLinkTo }) => (
  <div className="onboarding-all-done">
    <span className="onboarding-all-done-badge" aria-hidden="true">
      <CheckCircle2 size={32} strokeWidth={2} />
    </span>
    <h3 className="onboarding-all-done-title">
      {t('onboarding.allDone.title') || 'Tudo pronto!'}
    </h3>
    <p className="onboarding-all-done-description">
      {t('onboarding.allDone.description')}
    </p>
    <Link to={secondaryLinkTo} className="onboarding-all-done-link">
      {t('onboarding.allDone.secondaryLink') || 'Ver meus alunos'}
    </Link>
  </div>
);

OnboardingAllDoneState.propTypes = {
  secondaryLinkTo: PropTypes.string,
};

OnboardingAllDoneState.defaultProps = {
  secondaryLinkTo: '/trainer/students',
};

export default OnboardingAllDoneState;
