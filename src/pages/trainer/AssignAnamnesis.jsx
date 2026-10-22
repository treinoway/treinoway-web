import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAssignAnamnesisData from '../../hooks/useAssignAnamnesisData';
import AnamnesisEditorStatus from '../../components/anamnesis/AnamnesisEditorStatus';
import AssignWorkspace from '../../components/anamnesis/AssignWorkspace';

const AssignAnamnesis = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { anamnesis, students, linkedIds, status, errorMessage, retry } = useAssignAnamnesisData(anamnesisId);

  const from = location.state?.from ?? null;
  const handleBack = () => (from ? navigate(from) : navigate(-1));

  return (
    <div className="editor-page">
      <button type="button" className="btn btn--ghost editor-page__back" onClick={handleBack} aria-label="Voltar">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Voltar
      </button>
      {status === 'ready' ? (
        <>
          <h1 className="editor-page__title type-h1">Enviar anamnese para alunos</h1>
          <AssignWorkspace anamnesis={anamnesis} students={students} linkedIds={linkedIds} onBack={handleBack} />
        </>
      ) : (
        <AnamnesisEditorStatus state={status} errorMessage={errorMessage} onBack={handleBack} onRetry={retry} />
      )}
    </div>
  );
};

export default AssignAnamnesis;
