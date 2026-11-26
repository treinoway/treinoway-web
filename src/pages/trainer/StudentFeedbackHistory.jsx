import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getStudentFeedbackHistory, sendAdhocStudentFeedback } from '../../api/studentFeedback';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import AutoSendStatus from '../../components/studentFeedback/AutoSendStatus';
import FeedbackComparison from '../../components/studentFeedback/FeedbackComparison';
import FeedbackTimeline from '../../components/studentFeedback/FeedbackTimeline';
import HistoryEmptyState from '../../components/studentFeedback/HistoryEmptyState';
import LatestFeedback from '../../components/studentFeedback/LatestFeedback';
import OpenAnswers from '../../components/studentFeedback/OpenAnswers';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLoadResource from '../../hooks/useLoadResource';
import useStudentFeedbackConfig from '../../hooks/useStudentFeedbackConfig';
import { useStudentFeedbackTemplateOptions } from '../../hooks/useStudentFeedbackTemplates';
import { formatDayCount, isAnsweredFeedback, latestAnsweredPair, studentCallNameOf, studentTitleNameOf } from '../../utils/studentFeedback';
import { generalTemplateIdOf } from '../../utils/studentFeedbackTemplate';
import { t, tf } from '../../i18n';

const MIN_ANSWERED_TO_COMPARE = 2;

// Text of the history under the `studentFeedback.history` namespace
const th = (key) => t(`studentFeedback.history.${key}`);

// Button back to the student page
const BackButton = ({ onBack }) => (
  <button type="button" className="icon-button" aria-label={t('studentFeedback.back')} onClick={onBack}>
    <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
  </button>
);

BackButton.propTypes = { onBack: PropTypes.func.isRequired };

// Back, the student in the title and the ad-hoc send, unavailable while a feedback is pending
const HistoryHeader = ({ name, hasPending, onBack, onSendAdhoc }) => (
  <header className="ds-page-header">
    <div className="settings-header__heading">
      <BackButton onBack={onBack} />
      <h1 className="ds-page-header__title type-h1">{tf('studentFeedback.history.title', { name })}</h1>
    </div>
    <div className="ds-page-header__actions">
      <button type="button" className="btn btn--secondary" disabled={hasPending} onClick={onSendAdhoc}>
        <Send size={16} strokeWidth={2} aria-hidden="true" />
        {th('sendAdhoc')}
      </button>
    </div>
  </header>
);

HistoryHeader.propTypes = {
  name: PropTypes.string.isRequired,
  hasPending: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onSendAdhoc: PropTypes.func.isRequired,
};

// Timeline, latest result, comparison by send and open answers of the student, or the empty block before the first send
const HistoryContent = ({ feedbacks, next, autoSendEnabled, callName }) => {
  if (feedbacks.length === 0) return <HistoryEmptyState next={next} autoSendEnabled={autoSendEnabled} studentName={callName.atStart} studentNameInSentence={callName.inSentence} />;
  const answered = feedbacks.filter(isAnsweredFeedback);
  const { latest, previous } = latestAnsweredPair(feedbacks);
  return (
    <>
      <FeedbackTimeline feedbacks={feedbacks} next={next} />
      {latest && <LatestFeedback latest={latest} previous={previous} />}
      {answered.length >= MIN_ANSWERED_TO_COMPARE && <FeedbackComparison answered={answered} />}
      <OpenAnswers answered={answered} />
    </>
  );
};

HistoryContent.propTypes = {
  feedbacks: PropTypes.array.isRequired,
  next: PropTypes.object,
  autoSendEnabled: PropTypes.bool.isRequired,
  callName: PropTypes.shape({ atStart: PropTypes.string.isRequired, inSentence: PropTypes.string.isRequired }).isRequired,
};

// Picker of the template the ad-hoc feedback sends, shown inside the confirmation
const AdhocTemplateField = ({ templates, value, onChange }) => (
  <>
    <label className="field-label type-caption-strong" htmlFor="student-feedback-adhoc-template">{th('adhocTemplate')}</label>
    <select id="student-feedback-adhoc-template" className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
    </select>
  </>
);

AdhocTemplateField.propTypes = {
  templates: PropTypes.array.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Template chosen for the ad-hoc send: the general one until the trainer picks another; `sentTemplateId()` is what the send carries (nothing for the general one)
const useAdhocTemplateChoice = () => {
  const templates = useStudentFeedbackTemplateOptions();
  const [picked, setPicked] = useState(null);
  const generalId = generalTemplateIdOf(templates);
  const value = picked ?? generalId ?? '';
  const sentRef = useRef(undefined);

  // why: the confirmation keeps the send callback of the moment it opened, so the pick made inside the dialog is read through a ref
  useEffect(() => {
    sentRef.current = value === generalId ? undefined : value;
  });

  return { templates, value, pick: setPicked, reset: () => setPicked(null), sentTemplateId: () => sentRef.current };
};

// Question of the ad-hoc confirmation; it states the response window only when the trainer's configuration is known
const adhocConfirmMessageOf = (name, responseWindowDays) => {
  const question = tf('studentFeedback.history.confirmAdhoc', { name });
  if (responseWindowDays === null) return question;
  return `${question} ${tf('studentFeedback.history.confirmAdhocWindow', { window: formatDayCount(responseWindowDays) })}`;
};

// Response window of the trainer, or null while the configuration is loading or when it failed to load
const useResponseWindowDays = () => {
  const settings = useStudentFeedbackConfig();
  return settings.config ? settings.responseWindowDays : null;
};

// Ad-hoc send of the page: confirmation with the response window and the template picker, the send itself and the refresh of the history either way
const useAdhocSend = (studentId, reload) => {
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const template = useAdhocTemplateChoice();
  const responseWindowDays = useResponseWindowDays();

  const send = async () => {
    try {
      await sendAdhocStudentFeedback(studentId, template.sentTemplateId());
    } catch (err) {
      // why: a refusal usually means the history on screen is stale (a feedback is already pending), so it is refreshed while the error is shown
      reload({ silent: true });
      throw err;
    }
    showToast(th('adhocSent'), 'success');
    await reload({ silent: true });
  };

  const request = (name) => {
    template.reset();
    requestConfirm({
      message: adhocConfirmMessageOf(name, responseWindowDays),
      confirmLabel: th('confirmAdhocLabel'),
      confirmTone: 'primary',
      busyLabel: th('sendingAdhoc'),
      onConfirm: send,
    });
  };

  return { dialogProps, template, request };
};

// Confirmation of the ad-hoc send, with the template picker when the trainer has templates to choose from
const AdhocConfirmDialog = ({ dialogProps, template }) => (
  <ConfirmDialog {...dialogProps}>
    {template.templates.length > 0 && <AdhocTemplateField templates={template.templates} value={template.value} onChange={template.pick} />}
  </ConfirmDialog>
);

AdhocConfirmDialog.propTypes = {
  dialogProps: PropTypes.object.isRequired,
  template: PropTypes.shape({ templates: PropTypes.array.isRequired, value: PropTypes.string.isRequired, pick: PropTypes.func.isRequired }).isRequired,
};

// Failed load of the history: the way back and the retry
const HistoryError = ({ message, onBack, onRetry }) => {
  const retry = <button type="button" className="btn btn--secondary" onClick={onRetry}>{t('studentFeedback.retry')}</button>;
  return (
    <div className="student-feedback-page">
      <BackButton onBack={onBack} />
      <Banner tone="error" action={retry}>{message}</Banner>
    </div>
  );
};

HistoryError.propTypes = {
  message: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
};

// Feedback history of one student: auto-send status, timeline, latest result, comparison by send, open answers and the ad-hoc send with its template
const StudentFeedbackHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, loading, error, reload } = useLoadResource(() => getStudentFeedbackHistory(id), id, {
    onSilentError: (message) => showToast(message, 'error'),
  });
  const adhoc = useAdhocSend(id, reload);
  const handleBack = () => navigate(`/trainer/students/${id}`);

  if (loading) return <div className="loading-screen"><span className="loading-text">{t('studentFeedback.loading')}</span></div>;
  if (error) return <HistoryError message={error} onBack={handleBack} onRetry={() => reload()} />;

  const name = studentTitleNameOf(data.student.name);
  const callName = studentCallNameOf(data.student.name);

  return (
    <div className="student-feedback-page">
      <HistoryHeader name={name} hasPending={data.hasPending} onBack={handleBack} onSendAdhoc={() => adhoc.request(name)} />
      {data.autoSend && <AutoSendStatus autoSend={data.autoSend} studentName={callName.atStart} studentNameInSentence={callName.inSentence} />}
      {data.hasPending && <Banner>{th('pendingNote')}</Banner>}
      <HistoryContent feedbacks={data.feedbacks} next={data.autoSend?.next ?? null} autoSendEnabled={data.autoSend?.enabled === true} callName={callName} />
      {adhoc.dialogProps && <AdhocConfirmDialog dialogProps={adhoc.dialogProps} template={adhoc.template} />}
    </div>
  );
};

export default StudentFeedbackHistory;
