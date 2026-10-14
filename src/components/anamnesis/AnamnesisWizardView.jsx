import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { ClipboardList } from 'lucide-react';
import AnswerField from './AnswerField';
import WizardStepper from './WizardStepper';
import WizardReview from './WizardReview';
import { getQuestionDomId } from '../../utils/anamnesisAnswers';
import { formatTimeForDisplay } from '../../utils/dateFormat';
import { DRAFT_SAVE_STATUS } from '../../constants/anamnesis';

const STEPPER_MIN_STEPS = 3;
const JUMPABLE_STEPPER_MIN_STEPS = 2;

const useWizardFocus = ({ stepIndex, focusQuestionId, clearFocusRequest }, headingRef) => {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex, headingRef]);

  useEffect(() => {
    if (!focusQuestionId) return;
    const root = document.getElementById(getQuestionDomId(focusQuestionId));
    const target = root?.querySelector('input, textarea');
    if (!target) return;
    target.focus();
    clearFocusRequest();
  }, [focusQuestionId, stepIndex, clearFocusRequest]);
};

const getSaveStatusText = ({ status, savedAt }) => {
  if (status === DRAFT_SAVE_STATUS.SAVING) return 'Salvando...';
  if (status === DRAFT_SAVE_STATUS.SAVED) return `Rascunho salvo às ${formatTimeForDisplay(savedAt)}`;
  if (status === DRAFT_SAVE_STATUS.ERROR) return 'Não foi possível salvar — tentando de novo';
  return '';
};

// The live region stays mounted so screen readers announce each text change.
const DraftSaveStatus = ({ saveState }) => {
  const isError = saveState.status === DRAFT_SAVE_STATUS.ERROR;
  return (
    <p className={`anamnesis-save-status${isError ? ' anamnesis-save-status--error' : ''}`} aria-live="polite">
      {getSaveStatusText(saveState)}
    </p>
  );
};

const StepQuestions = ({ questions, answers, errors, onChange }) => {
  if (questions.length === 0) {
    return <p className="text-sm text-muted">Nenhuma pergunta para responder nesta etapa.</p>;
  }
  return questions.map((question, index) => (
    <AnswerField
      key={question.id}
      question={question}
      index={index}
      value={answers[question.id]}
      error={errors[question.id]}
      onChange={(value) => onChange(question.id, value)}
    />
  ));
};

const WizardStep = ({ wizard, headingRef, reviewHint }) => (
  <section className="card anamnesis-wizard-step" aria-labelledby="anamnesis-step-heading">
    <div className="anamnesis-wizard-step-header">
      <h2 id="anamnesis-step-heading" ref={headingRef} tabIndex={-1} className="anamnesis-wizard-heading">
        {wizard.steps[wizard.stepIndex].title}
      </h2>
      {wizard.currentSection?.description && (
        <p className="text-sm text-muted anamnesis-wizard-description">{wizard.currentSection.description}</p>
      )}
    </div>
    {wizard.isReview ? (
      <WizardReview summaries={wizard.summaries} onEdit={wizard.goToStep} hint={reviewHint} />
    ) : (
      <StepQuestions
        questions={wizard.visibleQuestions}
        answers={wizard.answers}
        errors={wizard.errors}
        onChange={wizard.setAnswer}
      />
    )}
  </section>
);

const WizardActionBar = ({ wizard, submitLabel, submitting, onBack, onSubmit }) => (
  <div className="anamnesis-wizard-actions">
    <div className="btn-group btn-group--equal">
      <button type="button" className="btn-secondary" onClick={onBack} disabled={submitting}>
        Voltar
      </button>
      {wizard.isReview ? (
        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={submitting || wizard.hasPending}
        >
          {submitting ? 'Carregando...' : submitLabel}
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={wizard.goNext}>
          Continuar
        </button>
      )}
    </div>
  </div>
);

/**
 * Presentational wizard shared by the student and the trainer flows: title,
 * stepper, current step (or review) and the action bar. State and submission
 * live in the caller. `allowJumpAhead` lets the user click any step (trainer flow).
 */
const AnamnesisWizardView = ({
  wizard,
  title,
  submitLabel,
  submitting,
  onSubmit,
  onExit,
  headerExtra,
  banner,
  reviewHint,
  saveState,
  allowJumpAhead = false,
}) => {
  const headingRef = useRef(null);
  useWizardFocus(wizard, headingRef);

  const handleBack = () => (wizard.isFirstStep ? onExit() : wizard.goBack());
  const stepperMinSteps = allowJumpAhead ? JUMPABLE_STEPPER_MIN_STEPS : STEPPER_MIN_STEPS;

  return (
    <div className="anamnesis-wizard">
      <div className="page-header-title-row">
        <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
        <h1 className="page-title">{title}</h1>
      </div>
      {headerExtra}
      {banner}
      {wizard.steps.length >= stepperMinSteps && (
        <WizardStepper
          steps={wizard.steps}
          currentIndex={wizard.stepIndex}
          onSelect={wizard.goToStep}
          allowJumpAhead={allowJumpAhead}
        />
      )}
      {saveState && <DraftSaveStatus saveState={saveState} />}
      <WizardStep wizard={wizard} headingRef={headingRef} reviewHint={reviewHint} />
      <WizardActionBar
        wizard={wizard}
        submitLabel={submitLabel}
        submitting={submitting}
        onBack={handleBack}
        onSubmit={onSubmit}
      />
    </div>
  );
};

DraftSaveStatus.propTypes = {
  saveState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    savedAt: PropTypes.instanceOf(Date),
  }).isRequired,
};

StepQuestions.propTypes = {
  questions: PropTypes.array.isRequired,
  answers: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

WizardStep.propTypes = {
  wizard: PropTypes.shape({
    steps: PropTypes.array.isRequired,
    stepIndex: PropTypes.number.isRequired,
    isReview: PropTypes.bool.isRequired,
    currentSection: PropTypes.object,
    summaries: PropTypes.array.isRequired,
    visibleQuestions: PropTypes.array.isRequired,
    answers: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    goToStep: PropTypes.func.isRequired,
    setAnswer: PropTypes.func.isRequired,
  }).isRequired,
  headingRef: PropTypes.object.isRequired,
  reviewHint: PropTypes.string,
};

WizardActionBar.propTypes = {
  wizard: PropTypes.shape({
    isReview: PropTypes.bool.isRequired,
    hasPending: PropTypes.bool.isRequired,
    goNext: PropTypes.func.isRequired,
  }).isRequired,
  submitLabel: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

AnamnesisWizardView.propTypes = {
  wizard: PropTypes.shape({
    steps: PropTypes.array.isRequired,
    stepIndex: PropTypes.number.isRequired,
    isFirstStep: PropTypes.bool.isRequired,
    goBack: PropTypes.func.isRequired,
    goToStep: PropTypes.func.isRequired,
  }).isRequired,
  title: PropTypes.string.isRequired,
  submitLabel: PropTypes.string.isRequired,
  submitting: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onExit: PropTypes.func.isRequired,
  headerExtra: PropTypes.node,
  banner: PropTypes.node,
  reviewHint: PropTypes.string,
  saveState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    savedAt: PropTypes.instanceOf(Date),
  }),
  allowJumpAhead: PropTypes.bool,
};

export default AnamnesisWizardView;
