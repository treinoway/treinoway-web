import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Send } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getStudentFeedbackHistory, sendAdhocStudentFeedback } from '../../api/studentFeedback';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import FeedbackTimeline from '../../components/studentFeedback/FeedbackTimeline';
import OpenAnswers from '../../components/studentFeedback/OpenAnswers';
import PillarTable from '../../components/studentFeedback/PillarTable';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLoadResource from '../../hooks/useLoadResource';
import { useStudentFeedbackTemplateOptions } from '../../hooks/useStudentFeedbackTemplates';
import { isAnsweredFeedback } from '../../utils/studentFeedback';
import { generalTemplateIdOf } from '../../utils/studentFeedbackTemplate';
import { t, tf } from '../../i18n';

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

// Pillars of the answered milestones, or the reason there is nothing to compare yet
const PillarsSection = ({ answered }) => (
  <section className="section-card student-feedback-section" aria-labelledby="student-feedback-pillars-heading">
    <h2 id="student-feedback-pillars-heading" className="type-h3 student-feedback-section__title">{th('pillarsTitle')}</h2>
    {answered.length > 0
      ? <PillarTable answered={answered} />
      : <p className="type-body student-feedback-section__note">{th('noAnswered')}</p>}
  </section>
);

PillarsSection.propTypes = { answered: PropTypes.array.isRequired };

// Timeline, pillars and open answers of the student, or the empty block before the first send
const HistoryContent = ({ feedbacks }) => {
  const answered = feedbacks.filter(isAnsweredFeedback);
  if (feedbacks.length === 0) return <EmptyBlock icon={MessagesSquare} title={th('empty')} description={th('emptyDescription')} />;
  return (
    <>
      <FeedbackTimeline feedbacks={feedbacks} />
      <PillarsSection answered={answered} />
      <OpenAnswers answered={answered} />
    </>
  );
};

HistoryContent.propTypes = { feedbacks: PropTypes.array.isRequired };

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

// Feedback history of one student: milestone timeline, pillars per milestone, open answers and the ad-hoc send with its template
const StudentFeedbackHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const { data, loading, error, reload } = useLoadResource(() => getStudentFeedbackHistory(id), id, {
    onSilentError: (message) => showToast(message, 'error'),
  });
  const adhocTemplate = useAdhocTemplateChoice();
  const handleBack = () => navigate(`/trainer/students/${id}`);

  const sendAdhoc = async () => {
    try {
      await sendAdhocStudentFeedback(id, adhocTemplate.sentTemplateId());
    } catch (err) {
      // why: a refusal usually means the history on screen is stale (a feedback is already pending), so it is refreshed while the error is shown
      reload({ silent: true });
      throw err;
    }
    showToast(th('adhocSent'), 'success');
    await reload({ silent: true });
  };

  if (loading) return <div className="loading-screen"><span className="loading-text">{t('studentFeedback.loading')}</span></div>;
  if (error) {
    const retry = <button type="button" className="btn btn--secondary" onClick={() => reload()}>{t('studentFeedback.retry')}</button>;
    return (
      <div className="student-feedback-page">
        <BackButton onBack={handleBack} />
        <Banner tone="error" action={retry}>{error}</Banner>
      </div>
    );
  }

  const name = data.student.name || t('studentFeedback.unnamedStudent');
  const handleSendAdhoc = () => {
    adhocTemplate.reset();
    requestConfirm({
      message: tf('studentFeedback.history.confirmAdhoc', { name }),
      confirmLabel: th('confirmAdhocLabel'),
      confirmTone: 'primary',
      busyLabel: th('sendingAdhoc'),
      onConfirm: sendAdhoc,
    });
  };
  const hasTemplateChoice = adhocTemplate.templates.length > 0;

  return (
    <div className="student-feedback-page">
      <HistoryHeader name={name} hasPending={data.hasPending} onBack={handleBack} onSendAdhoc={handleSendAdhoc} />
      {data.hasPending && <Banner>{th('pendingNote')}</Banner>}
      <HistoryContent feedbacks={data.feedbacks} />
      {dialogProps && (
        <ConfirmDialog {...dialogProps}>
          {hasTemplateChoice && <AdhocTemplateField templates={adhocTemplate.templates} value={adhocTemplate.value} onChange={adhocTemplate.pick} />}
        </ConfirmDialog>
      )}
    </div>
  );
};

export default StudentFeedbackHistory;
