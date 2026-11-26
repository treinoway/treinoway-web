import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { bandToneOf, formatScore, latestAnsweredPair, studentCallNameOf } from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

// Overall index of the latest answered feedback as "58 de 100", with its band
const LastIndex = ({ feedback }) => (
  <span className="type-body student-feedback-card__index">
    {t('studentFeedback.card.lastIndex')}
    {' '}
    <strong className="type-body-strong student-feedback-card__value">{formatScore(feedback.overallIndex)}</strong>
    {' '}
    {t('studentFeedback.outOf100')}
    {feedback.band && (
      <>
        {' '}
        <Badge tone={bandToneOf(feedback.band)}>{feedback.bandLabel}</Badge>
      </>
    )}
  </span>
);

LastIndex.propTypes = { feedback: PropTypes.object.isRequired };

// Whether the automatic sending is on, as a badge, with the note that nothing is scheduled when it is on without a next send
const AutoSendState = ({ autoSend, studentName }) => (
  <>
    <Badge variant="tag" tone={autoSend.enabled ? 'success' : 'neutral'}>{t(autoSend.enabled ? 'studentFeedback.autoSendOn' : 'studentFeedback.autoSendOff')}</Badge>
    {autoSend.enabled && !autoSend.next && (
      <span className="type-body student-feedback-card__index">{tf('studentFeedback.nothingScheduled', { name: studentCallNameOf(studentName).inSentence })}</span>
    )}
  </>
);

AutoSendState.propTypes = {
  autoSend: PropTypes.shape({ enabled: PropTypes.bool.isRequired, next: PropTypes.object }).isRequired,
  studentName: PropTypes.string,
};

/** "Feedback" card of the student page: auto-send state and last index when the history is known, and the way into the feedback history. */
const StudentFeedbackCard = ({ onViewAll, history = null }) => {
  const autoSend = history?.autoSend ?? null;
  const latest = latestAnsweredPair(history?.feedbacks ?? []).latest;
  const hasState = Boolean(autoSend || latest);
  return (
    <section className="section-card cockpit-card" aria-labelledby="student-feedback-heading">
      <header className="cockpit-card__header">
        <h3 id="student-feedback-heading" className="cockpit-card__title type-h3">{t('studentFeedback.card.title')}</h3>
        <div className="cockpit-card__actions">
          <button type="button" className="btn btn--secondary" onClick={onViewAll}>
            {t('studentFeedback.card.viewAll')}
          </button>
        </div>
      </header>
      {hasState ? (
        <div className="student-feedback-card__state">
          {autoSend && <AutoSendState autoSend={autoSend} studentName={history.student?.name} />}
          {latest && <LastIndex feedback={latest} />}
        </div>
      ) : <p className="type-body student-feedback-card__text">{t('studentFeedback.card.description')}</p>}
    </section>
  );
};

StudentFeedbackCard.propTypes = {
  onViewAll: PropTypes.func.isRequired,
  history: PropTypes.shape({
    student: PropTypes.shape({ name: PropTypes.string }),
    autoSend: PropTypes.shape({ enabled: PropTypes.bool.isRequired, next: PropTypes.object }),
    feedbacks: PropTypes.array,
  }),
};

export default StudentFeedbackCard;
