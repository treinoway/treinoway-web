import PropTypes from 'prop-types';
import PillarTable from './PillarTable';
import { t } from '../../i18n';

// Pillars and overall index of every answered feedback side by side, one column per send
const FeedbackComparison = ({ answered }) => (
  <section className="section-card student-feedback-section" aria-labelledby="student-feedback-comparison-heading">
    <h2 id="student-feedback-comparison-heading" className="type-h3 student-feedback-section__title">
      {t('studentFeedback.history.comparisonTitle')}
    </h2>
    <PillarTable answered={answered} />
  </section>
);

FeedbackComparison.propTypes = {
  answered: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default FeedbackComparison;
