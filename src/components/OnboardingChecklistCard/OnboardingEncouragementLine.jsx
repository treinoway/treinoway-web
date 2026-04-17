import PropTypes from 'prop-types';
import { getEncouragementCopy } from '../../utils/onboardingProfile';

const OnboardingEncouragementLine = ({ doneCount }) => {
  const copy = getEncouragementCopy(doneCount);
  if (!copy) return null;

  return <p className="onboarding-encouragement">{copy}</p>;
};

OnboardingEncouragementLine.propTypes = {
  doneCount: PropTypes.number.isRequired,
};

export default OnboardingEncouragementLine;
