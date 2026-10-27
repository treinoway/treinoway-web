import PropTypes from 'prop-types';
import { getEncouragementCopy } from '../../utils/onboardingProfile';

const OnboardingEncouragementLine = ({ doneCount, totalCount }) => {
  const copy = getEncouragementCopy({ done: doneCount, total: totalCount });
  if (!copy) return null;

  return <p className="onboarding-encouragement">{copy}</p>;
};

OnboardingEncouragementLine.propTypes = {
  doneCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default OnboardingEncouragementLine;
