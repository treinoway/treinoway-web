import PropTypes from 'prop-types';
import { t } from '../../i18n';

const OnboardingProgressPill = ({ doneCount, totalCount }) => {
  const template = t('onboarding.progressPill') || '{done} de {total}';
  const label = template
    .replace('{done}', String(doneCount))
    .replace('{total}', String(totalCount));

  return (
    <span className="onboarding-progress-pill" aria-live="polite">
      {label}
    </span>
  );
};

OnboardingProgressPill.propTypes = {
  doneCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default OnboardingProgressPill;
