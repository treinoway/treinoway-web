import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useAnamnesisRecord from '../../hooks/useAnamnesisRecord';
import AnamnesisEditorStatus from '../../components/anamnesis/AnamnesisEditorStatus';
import AnamnesisEditorWorkspace from '../../components/anamnesis/AnamnesisEditorWorkspace';

const AnamnesisEditor = ({ anamnesisId }) => {
  const navigate = useNavigate();
  const { anamnesis, setAnamnesis, status, errorMessage, refetch, retry } = useAnamnesisRecord(anamnesisId);
  const handleBack = () => navigate('/trainer/anamneses');

  return (
    <div className="editor-page anamnesis-editor">
      <button type="button" className="btn btn--ghost editor-page__back" onClick={handleBack} aria-label="Voltar para anamneses">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Voltar
      </button>
      {status === 'ready' ? (
        <AnamnesisEditorWorkspace anamnesis={anamnesis} setAnamnesis={setAnamnesis} refetch={refetch} />
      ) : (
        <AnamnesisEditorStatus state={status} errorMessage={errorMessage} onBack={handleBack} onRetry={retry} />
      )}
    </div>
  );
};

AnamnesisEditor.propTypes = { anamnesisId: PropTypes.string.isRequired };

/** Keyed by id so forking/copying (navigate to the new id) starts from a clean state. */
const AnamnesisDetail = () => {
  const { anamnesisId } = useParams();
  return <AnamnesisEditor key={anamnesisId} anamnesisId={anamnesisId} />;
};

export default AnamnesisDetail;
