import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import useAnamnesisWizard from '../../hooks/useAnamnesisWizard';
import AnswerField from '../../components/anamnesis/AnswerField';
import WizardStepper from '../../components/anamnesis/WizardStepper';
import WizardReview from '../../components/anamnesis/WizardReview';
import { getQuestionDomId } from '../../utils/anamnesisAnswers';

const LIST_PATH = '/my/anamneses';
const STEPPER_MIN_STEPS = 3;

// The response endpoint answers 404 when the student has not answered yet.
const fetchWizardData = async (anamnesisId) => {
  const [linksResult, responseResult] = await Promise.allSettled([
    api.get('/my/anamneses'),
    api.get(`/my/anamneses/${anamnesisId}/response`),
  ]);
  if (linksResult.status === 'rejected') throw linksResult.reason;
  const link = linksResult.value.data.find(
    (item) => item.anamnesisId === anamnesisId || item.anamnesis?.id === anamnesisId,
  );
  if (!link) return { link: null, response: null };
  if (responseResult.status === 'fulfilled') return { link, response: responseResult.value.data };
  if (responseResult.reason?.response?.status === 404) return { link, response: null };
  throw responseResult.reason;
};

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

const WizardMessage = ({ title, text, onBack }) => (
  <div className="empty-state">
    <div className="empty-state-icon empty-state-icon--accent">
      <ClipboardList size={32} strokeWidth={2} />
    </div>
    <p className="empty-state-title">{title}</p>
    <p>{text}</p>
    <button type="button" className="btn-primary" onClick={onBack}>
      Voltar para anamneses
    </button>
  </div>
);

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

const WizardActionBar = ({ wizard, submitting, onBack, onContinue, onSubmit }) => {
  const submitLabel = wizard.hasPreviousResponse ? 'Atualizar respostas' : 'Enviar respostas';
  return (
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
          <button type="button" className="btn-primary" onClick={onContinue}>
            Continuar
          </button>
        )}
      </div>
    </div>
  );
};

const useWizardSubmit = (anamnesisId, wizard) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/my/anamneses/${anamnesisId}/response`, wizard.buildPayload());
      showToast('Resposta enviada com sucesso!', 'success');
      navigate(LIST_PATH);
    } catch (error) {
      const details = error.response?.data?.details;
      if (error.response?.status === 400 && wizard.applyServerErrors(details)) return;
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, handleSubmit };
};

const WizardStep = ({ wizard, headingRef }) => (
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
      <WizardReview summaries={wizard.summaries} onEdit={wizard.goToStep} />
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

const WizardContent = ({ anamnesisId, anamnesis, previousResponse }) => {
  const navigate = useNavigate();
  const wizard = useAnamnesisWizard({ anamnesis, previousResponse });
  const { submitting, handleSubmit } = useWizardSubmit(anamnesisId, wizard);
  const headingRef = useRef(null);
  useWizardFocus(wizard, headingRef);

  const handleBackToList = () => navigate(LIST_PATH);
  const handleBack = () => (wizard.isFirstStep ? handleBackToList() : wizard.goBack());

  if (wizard.steps.length === 1) {
    return (
      <WizardMessage
        title="Anamnese sem perguntas"
        text="Esta anamnese ainda não possui perguntas para responder."
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="anamnesis-wizard">
      <div className="page-header-title-row">
        <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
        <h1 className="page-title">{anamnesis.title}</h1>
      </div>
      {wizard.steps.length >= STEPPER_MIN_STEPS && (
        <WizardStepper steps={wizard.steps} currentIndex={wizard.stepIndex} onSelect={wizard.goToStep} />
      )}
      <WizardStep wizard={wizard} headingRef={headingRef} />
      <WizardActionBar
        wizard={wizard}
        submitting={submitting}
        onBack={handleBack}
        onContinue={wizard.goNext}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

const AnamnesisWizard = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', link: null, response: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ status: 'loading', link: null, response: null });
      try {
        const { link, response } = await fetchWizardData(anamnesisId);
        if (!cancelled) setState({ status: link ? 'ready' : 'notFound', link, response });
      } catch (error) {
        if (cancelled) return;
        showToast(error.userMessage || translateError(error), 'error');
        setState({ status: 'error', link: null, response: null });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [anamnesisId, showToast]);

  const handleBackToList = () => navigate(LIST_PATH);

  if (state.status === 'loading') {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (state.status === 'notFound') {
    return (
      <WizardMessage
        title="Anamnese não encontrada"
        text="Esta anamnese não está vinculada ao seu perfil."
        onBack={handleBackToList}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <WizardMessage
        title="Não foi possível carregar"
        text="Tente novamente em instantes."
        onBack={handleBackToList}
      />
    );
  }

  return (
    <WizardContent
      key={anamnesisId}
      anamnesisId={anamnesisId}
      anamnesis={state.link.anamnesis}
      previousResponse={state.response}
    />
  );
};

WizardMessage.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

StepQuestions.propTypes = {
  questions: PropTypes.array.isRequired,
  answers: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

WizardActionBar.propTypes = {
  wizard: PropTypes.shape({
    isReview: PropTypes.bool.isRequired,
    hasPending: PropTypes.bool.isRequired,
    hasPreviousResponse: PropTypes.bool.isRequired,
  }).isRequired,
  submitting: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
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
};

WizardContent.propTypes = {
  anamnesisId: PropTypes.string.isRequired,
  anamnesis: PropTypes.object.isRequired,
  previousResponse: PropTypes.object,
};

export default AnamnesisWizard;
