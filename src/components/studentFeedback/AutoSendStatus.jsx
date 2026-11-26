import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Badge from '../ds/Badge';
import { STUDENT_FEEDBACK_SETTINGS_PATH } from '../../constants/studentFeedback';
import { formatDayMonthForDisplay, formatTimeForDisplay } from '../../utils/dateFormat';
import { milestoneLabelOf } from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

// Text of the status line under the `studentFeedback.history.autoSend` namespace
const ta = (key) => t(`studentFeedback.history.autoSend.${key}`);

// Which milestone goes out next and when
const NextSend = ({ next }) => (
  <span className="type-body student-feedback-autosend__text">
    {ta('next')}
    {' '}
    <strong className="student-feedback-autosend__milestone">{milestoneLabelOf(next)}</strong>
    {tf('studentFeedback.history.autoSend.nextDue', { date: formatDayMonthForDisplay(next.dueAt), time: formatTimeForDisplay(next.dueAt) })}
  </span>
);

NextSend.propTypes = { next: PropTypes.object.isRequired };

// Status line of the automatic sending for one student: on with the next send or the note that none is scheduled, or off with the way to turn it on
const AutoSendStatus = ({ autoSend, studentName, studentNameInSentence = t('studentFeedback.studentFallback') }) => {
  const { enabled, next } = autoSend;
  return (
    <section className="section-card student-feedback-autosend" aria-label={ta('aria')}>
      <Badge variant="tag" tone={enabled ? 'success' : 'neutral'}>{t(enabled ? 'studentFeedback.autoSendOn' : 'studentFeedback.autoSendOff')}</Badge>
      {enabled && next && <NextSend next={next} />}
      {enabled && !next && <span className="type-body student-feedback-autosend__text">{tf('studentFeedback.nothingScheduled', { name: studentNameInSentence })}</span>}
      {!enabled && <span className="type-body student-feedback-autosend__text">{tf('studentFeedback.history.autoSend.offNote', { name: studentName })}</span>}
      <Link className="type-body-strong student-feedback-autosend__link" to={STUDENT_FEEDBACK_SETTINGS_PATH}>
        {ta(enabled ? 'configure' : 'enable')}
      </Link>
    </section>
  );
};

AutoSendStatus.propTypes = {
  autoSend: PropTypes.shape({ enabled: PropTypes.bool.isRequired, next: PropTypes.object }).isRequired,
  studentName: PropTypes.string.isRequired,
  studentNameInSentence: PropTypes.string,
};

export default AutoSendStatus;
