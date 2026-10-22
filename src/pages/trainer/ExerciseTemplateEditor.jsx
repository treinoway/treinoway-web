import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryEditorLayout from '../../components/LibraryEditorLayout';
import ExerciseTemplateForm from '../../components/ExerciseTemplateForm';
import { useAuth } from '../../contexts/AuthContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useExerciseTemplateRecord from '../../hooks/useExerciseTemplateRecord';

const LIST_PATH = '/trainer/exercise-templates';

const ExerciseTemplateEditorContent = ({ templateId }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const record = useExerciseTemplateRecord(templateId);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [liveName, setLiveName] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const handleLeave = () => {
    if (!isDirty) {
      navigate(LIST_PATH);
      return;
    }
    requestConfirm({
      message: 'Descartar alterações? As mudanças feitas neste exercício ainda não foram salvas.',
      confirmLabel: 'Descartar',
      onConfirm: () => navigate(LIST_PATH),
    });
  };

  const fallbackTitle = templateId ? 'Exercício sem nome' : 'Novo exercício';

  return (
    <LibraryEditorLayout
      title={liveName.trim() || fallbackTitle}
      state={record.status}
      loadingLabel="Carregando exercício"
      errorTitle="Não foi possível carregar o exercício"
      errorDescription={record.loadError}
      notFound={{
        title: 'Exercício não encontrado',
        description: 'Ele pode ter sido excluído ou o link está incorreto.',
        actionLabel: 'Voltar para exercícios',
      }}
      onBack={handleLeave}
      onRetry={record.retry}
    >
      <ExerciseTemplateForm
        variant="page"
        isAdmin={isAdmin}
        exerciseTemplate={record.template}
        onSuccess={() => navigate(LIST_PATH)}
        onCancel={handleLeave}
        onNameChange={setLiveName}
        onDirtyChange={setIsDirty}
      />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </LibraryEditorLayout>
  );
};

ExerciseTemplateEditorContent.propTypes = {
  templateId: PropTypes.string,
};

/** One component for "Novo exercício" (`/new`) and edit (`/:id`). Keyed by id so state never leaks between exercises. */
const ExerciseTemplateEditor = () => {
  const { id } = useParams();
  return <ExerciseTemplateEditorContent key={id ?? 'new'} templateId={id} />;
};

export default ExerciseTemplateEditor;
