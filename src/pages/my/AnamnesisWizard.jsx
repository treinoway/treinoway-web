import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import useAnamnesisWizard from '../../hooks/useAnamnesisWizard';
import useAnamnesisSubmit from '../../hooks/useAnamnesisSubmit';
import useAnamnesisResponseSource, { ANAMNESIS_SOURCE_MODE } from '../../hooks/useAnamnesisResponseSource';
import AnamnesisMessage from '../../components/anamnesis/AnamnesisMessage';
import AnamnesisWizardView from '../../components/anamnesis/AnamnesisWizardView';

const LIST_PATH = '/my/anamneses';
const BACK_LABEL = 'Voltar para anamneses';

const WizardContent = ({ anamnesis, previousResponse, submit }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const wizard = useAnamnesisWizard({ anamnesis, previousResponse });
  const handleBackToList = () => navigate(LIST_PATH);
  const { submitting, handleSubmit } = useAnamnesisSubmit({
    wizard,
    submit,
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
      key={anamnesisId}
      anamnesis={source.anamnesis}
      previousResponse={source.previousResponse}
      submit={source.submit}
    />
  );
};

WizardContent.propTypes = {
  anamnesis: PropTypes.object.isRequired,
  previousResponse: PropTypes.object,
  submit: PropTypes.func.isRequired,
};

export default AnamnesisWizard;
