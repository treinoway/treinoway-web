import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import useAnamnesisWizard from '../../hooks/useAnamnesisWizard';
import useAnamnesisSubmit from '../../hooks/useAnamnesisSubmit';
import useAnamnesisResponseSource, { ANAMNESIS_SOURCE_MODE } from '../../hooks/useAnamnesisResponseSource';
import AnamnesisMessage from '../../components/anamnesis/AnamnesisMessage';
import AnamnesisWizardView from '../../components/anamnesis/AnamnesisWizardView';
import PresenceGate from '../../components/anamnesis/PresenceGate';
import InfoBanner from '../../components/InfoBanner';
import { ANAMNESIS_FILLED_BY, ANAMNESIS_RESPONSE_STATUS } from '../../constants/anamnesis';
import { isAnswerEmpty } from '../../utils/anamnesisAnswers';
import { getStudentFirstName, getStudentFullName } from '../../utils/studentName';

const REVIEW_HINT = 'Confira as respostas com o aluno antes de salvar.';

const LoadingScreen = () => (
  <div className="loading-screen">
    <span className="loading-text">Carregando...</span>
  </div>
);

const useFillStudent = (studentId) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', student: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ status: 'loading', student: null });
      try {
        const { data } = await api.get(`/trainer/students/${studentId}`);
        if (!cancelled) setState({ status: 'ready', student: data });
      } catch (error) {
        if (cancelled) return;
        if (error.response?.status === 404) {
          setState({ status: 'notFound', student: null });
          return;
        }
        showToast(error.userMessage || translateError(error), 'error');
        setState({ status: 'error', student: null });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId, showToast]);

  return state;
};

const pluralizeQuestions = (count) => (count === 1 ? '1 pergunta' : `${count} perguntas`);

const getPrefillNotice = (response, firstName) => {
  if (!response) return null;
  const isTrainerSubmission =
    response.filledBy === ANAMNESIS_FILLED_BY.TRAINER && response.status !== ANAMNESIS_RESPONSE_STATUS.DRAFT;
  if (isTrainerSubmission) {
    return `Você já registrou esta anamnese. Salvar de novo substitui as respostas e pede que ${firstName} confirme novamente.`;
  }
  const answered = (response.answers ?? []).filter((answer) => !isAnswerEmpty(answer.value)).length;
  if (answered === 0) return null;
  if (response.filledBy === ANAMNESIS_FILLED_BY.TRAINER) {
    return `Há ${pluralizeQuestions(answered)} salvas em rascunho. Vamos continuar a partir delas.`;
  }
  return `${firstName} já respondeu ${pluralizeQuestions(answered)} pelo app. Vamos continuar a partir delas.`;
};

const FillWizard = ({ student, anamnesis, previousResponse, source, dossierPath, onExit }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const firstName = getStudentFirstName(student);
  const wizard = useAnamnesisWizard({ anamnesis, previousResponse });
  const { submitting, handleSubmit } = useAnamnesisSubmit({
    wizard,
    submit: source.submit,
    onSubmitted: () => {
      showToast(`Anamnese registrada. ${firstName} vai confirmar pelo app.`, 'success');
      navigate(dossierPath);
    },
    onConflict: source.reload,
  });
  const notice = getPrefillNotice(previousResponse, firstName);

  if (wizard.steps.length === 1) {
    return (
      <AnamnesisMessage
        title="Anamnese sem perguntas"
        text="Esta anamnese ainda não possui perguntas para responder."
        actionLabel="Voltar para anamneses"
        onAction={onExit}
      />
    );
  }

  return (
    <AnamnesisWizardView
      wizard={wizard}
      title={anamnesis.title}
      submitLabel="Salvar respostas"
      submitting={submitting}
      onSubmit={handleSubmit}
      onExit={onExit}
      headerExtra={<p className="anamnesis-wizard-byline">Preenchendo por {getStudentFullName(student)}</p>}
      banner={notice && <InfoBanner text={notice} />}
      reviewHint={REVIEW_HINT}
    />
  );
};

const getReadOnlyText = (response, firstName) =>
  response?.filledBy === ANAMNESIS_FILLED_BY.STUDENT
    ? `${firstName} já enviou esta anamnese pelo app.`
    : 'Esta anamnese foi preenchida por outro professor.';

const FillFlow = ({ student, source, dossierPath, listPath }) => {
  const navigate = useNavigate();
  const handleExit = () => navigate(listPath);

  if (source.status === 'idle' || source.status === 'loading') return <LoadingScreen />;

  if (source.status === 'notFound') {
    return (
      <AnamnesisMessage
        title="Anamnese não encontrada"
        text="Esta anamnese não está vinculada a este aluno."
        actionLabel="Voltar para anamneses"
        onAction={handleExit}
      />
    );
  }

  if (source.status === 'error') {
    return (
      <AnamnesisMessage
        title="Não foi possível carregar"
        text="Tente novamente em instantes."
        actionLabel="Voltar para anamneses"
        onAction={handleExit}
      />
    );
  }

  if (!source.canFinalize) {
    return (
      <AnamnesisMessage
        title="Anamnese já preenchida"
        text={getReadOnlyText(source.previousResponse, getStudentFirstName(student))}
        actionLabel="Ver respostas"
        onAction={() => navigate(dossierPath)}
      />
    );
  }

  return (
    <FillWizard
      student={student}
      anamnesis={source.anamnesis}
      previousResponse={source.previousResponse}
      source={source}
      dossierPath={dossierPath}
      onExit={handleExit}
    />
  );
};

const TrainerAnamnesisFill = () => {
  const { studentId, anamnesisId } = useParams();
  const navigate = useNavigate();
  const [presenceConfirmed, setPresenceConfirmed] = useState(false);
  const { status, student } = useFillStudent(studentId);
  const source = useAnamnesisResponseSource({
    mode: ANAMNESIS_SOURCE_MODE.TRAINER,
    anamnesisId,
    studentId,
    enabled: presenceConfirmed,
  });
  const listPath = `/trainer/students/${studentId}/anamneses`;
  const dossierPath = `/trainer/students/${studentId}/anamneses/${anamnesisId}/response`;

  if (status === 'loading') return <LoadingScreen />;

  if (status !== 'ready') {
    const isNotFound = status === 'notFound';
    return (
      <AnamnesisMessage
        title={isNotFound ? 'Aluno não encontrado' : 'Não foi possível carregar'}
        text={isNotFound ? 'Aluno não encontrado ou não vinculado a você.' : 'Tente novamente em instantes.'}
        actionLabel="Voltar para alunos"
        onAction={() => navigate('/trainer/students')}
      />
    );
  }

  if (!presenceConfirmed) {
    return (
      <PresenceGate
        student={student}
        onStart={() => setPresenceConfirmed(true)}
        onCancel={() => navigate(listPath)}
      />
    );
  }

  return <FillFlow student={student} source={source} dossierPath={dossierPath} listPath={listPath} />;
};

FillWizard.propTypes = {
  student: PropTypes.object.isRequired,
  anamnesis: PropTypes.object.isRequired,
  previousResponse: PropTypes.object,
  source: PropTypes.shape({
    submit: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
  }).isRequired,
  dossierPath: PropTypes.string.isRequired,
  onExit: PropTypes.func.isRequired,
};

FillFlow.propTypes = {
  student: PropTypes.object.isRequired,
  source: PropTypes.shape({
    status: PropTypes.string.isRequired,
    canFinalize: PropTypes.bool.isRequired,
    anamnesis: PropTypes.object,
    previousResponse: PropTypes.object,
  }).isRequired,
  dossierPath: PropTypes.string.isRequired,
  listPath: PropTypes.string.isRequired,
};

export default TrainerAnamnesisFill;
