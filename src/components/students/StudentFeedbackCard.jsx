import PropTypes from 'prop-types';
import { t } from '../../i18n';

/** "Feedback" card of the student page: what it holds and the way into the feedback history. */
const StudentFeedbackCard = ({ onViewAll }) => (
  <section className="section-card cockpit-card" aria-labelledby="student-feedback-heading">
    <header className="cockpit-card__header">
      <h3 id="student-feedback-heading" className="cockpit-card__title type-h3">{t('studentFeedback.card.title')}</h3>
      <div className="cockpit-card__actions">
        <button type="button" className="btn btn--secondary" onClick={onViewAll}>
          {t('studentFeedback.card.viewAll')}
        </button>
      </div>
    </header>
    <p className="type-body student-feedback-card__text">{t('studentFeedback.card.description')}</p>
  </section>
);

StudentFeedbackCard.propTypes = { onViewAll: PropTypes.func.isRequired };

export default StudentFeedbackCard;
