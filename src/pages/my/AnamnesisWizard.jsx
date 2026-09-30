import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import useAnamnesisWizard from '../../hooks/useAnamnesisWizard';
import useAnamnesisDraft from '../../hooks/useAnamnesisDraft';
import useAnamnesisSubmit from '../../hooks/useAnamnesisSubmit';
import useAnamnesisResponseSource, { ANAMNESIS_SOURCE_MODE } from '../../hooks/useAnamnesisResponseSource';
import AnamnesisMessage from '../../components/anamnesis/AnamnesisMessage';
import AnamnesisWizardView from '../../components/anamnesis/AnamnesisWizardView';
import InfoBanner from '../../components/InfoBanner';

const LIST_PATH = '/my/anamneses';
const BACK_LABEL = 'Voltar para anamneses';
const RESUME_NOTICE = 'Continuando de onde você parou.';

const WizardContent = ({ anamnesis, previousResponse, source }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [resumeNoticeDismissed, setResumeNoticeDismissed] = useState(false);
  const wizard = useAnamnesisWizard({ anamnesis, previousResponse });
  // A draft conflict means the response was submitted meanwhile: reloading shows it as submitted.
  const draft = useAnamnesisDraft({
    enabled: source.canAutosave,
    answers: wizard.answers,
    stepIndex: wizard.stepIndex,
    hasChanges: wizard.hasChanges,
    save: source.saveDraft,
    onConflict: source.reload,
  });
  const handleBackToList = () => navigate(LIST_PATH);
  const { submitting, handleSubmit } = useAnamnesisSubmit({
    wizard,
    draft,
    submit: source.submit,
    onSubmitted: () => {
      showToast('Resposta enviada com sucesso!', 'success');
      handleBackToList();
    },
  });

  if (wizard.steps.length === 1) {
    return (
      <AnamnesisMessage
        title="Anamnese sem perguntas"
        text="Esta anamnese ainda não possui perguntas para responder."
        actionLabel={BACK_LABEL}
        onAction={handleBackToList}
      />
    );
  }

  return (
    <AnamnesisWizardView
      wizard={wizard}
      title={anamnesis.title}
      submitLabel={wizard.hasPreviousResponse ? 'Atualizar respostas' : 'Enviar respostas'}
      submitting={submitting}
      onSubmit={handleSubmit}
      onExit={handleBackToList}
      saveState={draft.enabled ? draft.saveState : undefined}
      banner={
        wizard.isResumingDraft && !resumeNoticeDismissed && (
          <InfoBanner text={RESUME_NOTICE} onDismiss={() => setResumeNoticeDismissed(true)} />
        )
      }
    />
  );
};

const AnamnesisWizard = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const source = useAnamnesisResponseSource({ mode: ANAMNESIS_SOURCE_MODE.STUDENT, anamnesisId });
  const handleBackToList = () => navigate(LIST_PATH);

  if (source.status === 'loading') {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (source.status === 'notFound') {
    return (
      <AnamnesisMessage
        title="Anamnese não encontrada"
        text="Esta anamnese não está vinculada ao seu perfil."
        actionLabel={BACK_LABEL}
        onAction={handleBackToList}
      />
    );
  }

  if (source.status === 'error') {
    return (
      <AnamnesisMessage
        title="Não foi possível carregar"
        text="Tente novamente em instantes."
        actionLabel={BACK_LABEL}
        onAction={handleBackToList}
      />
    );
  }

  return (
    <WizardContent
      key={`${anamnesisId}:${source.version}`}
      anamnesis={source.anamnesis}
      previousResponse={source.previousResponse}
      source={source}
    />
  );
};

WizardContent.propTypes = {
  anamnesis: PropTypes.object.isRequired,
  previousResponse: PropTypes.object,
  source: PropTypes.shape({
    canAutosave: PropTypes.bool.isRequired,
    submit: PropTypes.func.isRequired,
    saveDraft: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
  }).isRequired,
};

export default AnamnesisWizard;
