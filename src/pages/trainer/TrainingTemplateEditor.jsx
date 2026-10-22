import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryEditorLayout from '../../components/LibraryEditorLayout';
import TrainingTemplateFields from '../../components/trainingTemplate/TrainingTemplateFields';
import TrainingTemplateExercises from '../../components/trainingTemplate/TrainingTemplateExercises';
import CreateExerciseTemplateModal from '../../components/CreateExerciseTemplateModal';
import EditExerciseSheet from '../../components/EditExerciseSheet';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useTrainingTemplateEditor from '../../hooks/useTrainingTemplateEditor';
import { findJunction } from '../../utils/trainingTemplateDraft';
import { useToast } from '../../contexts/ToastContext';

const LIST_PATH = '/trainer/training-templates';

const validate = ({ name, category }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Informe o nome do treino.';
  if (!category) errors.category = 'Selecione a categoria.';
  return errors;
};

const getTitle = (name, isEditing) => {
  if (name.trim()) return name.trim();
  return isEditing ? 'Treino único sem nome' : 'Novo treino único';
};

const TrainingTemplateEditorContent = ({ templateId }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const editor = useTrainingTemplateEditor(templateId);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [errors, setErrors] = useState({});
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState(null);

  const handleLeave = () => {
    if (!editor.isDirty) {
      navigate(LIST_PATH);
      return;
    }
    requestConfirm({
      message: 'Descartar alterações? As mudanças feitas neste treino ainda não foram salvas.',
      confirmLabel: 'Descartar',
      onConfirm: () => navigate(LIST_PATH),
    });
  };

  const handleFieldChange = (field, value) => {
    editor.updateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(editor.formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (await editor.save()) navigate(LIST_PATH);
  };

  const handleExerciseCreated = (result) => {
    setShowCreateExercise(false);
    editor.refreshAvailableExercises();
    if (result?.id != null) editor.addExercise(result);
  };

  const handleSubmitExerciseOverrides = async (payload) => {
    if (await editor.saveExerciseOverrides(editingExerciseId, payload)) setEditingExerciseId(null);
  };

  const editingJunction = editingExerciseId ? findJunction(editor.junctions, editingExerciseId) : null;

  return (
    <LibraryEditorLayout
      title={getTitle(editor.formData.name, editor.isEditing)}
      state={editor.status}
      loadingLabel="Carregando treino único"
      errorTitle="Não foi possível carregar o treino único"
      errorDescription={editor.loadError}
      notFound={{
        title: 'Treino único não encontrado',
        description: 'Ele pode ter sido excluído ou o link está incorreto.',
        actionLabel: 'Voltar para treinos únicos',
      }}
      onBack={handleLeave}
      onRetry={editor.retryLoad}
    >
      <form className="editor-page__form" onSubmit={handleSubmit} noValidate>
        <div className="editor-page__split">
          <div className="editor-page__col">
          <TrainingTemplateFields
            formData={editor.formData}
            errors={errors}
            disabled={editor.saving}
            canSetVisibility={editor.isAdmin}
            onChange={handleFieldChange}
          />
          </div>
          <div className="editor-page__col editor-page__col--wide">
          <TrainingTemplateExercises
            exerciseIds={editor.formData.exerciseTemplateIds}
            junctions={editor.junctions}
            availableExercises={editor.availableExercises}
            disabled={editor.saving}
            onAdd={editor.addExercise}
            onRemove={editor.removeExercise}
            onEdit={setEditingExerciseId}
            onCreateNew={() => setShowCreateExercise(true)}
          />
          </div>
        </div>

        <div className="editor-page__footer">
          <button type="button" className="btn btn--secondary" onClick={handleLeave} disabled={editor.saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={editor.saving}>
            {editor.saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {showCreateExercise && (
        <CreateExerciseTemplateModal
          open
          isAdmin={editor.isAdmin}
          onClose={() => setShowCreateExercise(false)}
          onSuccess={handleExerciseCreated}
        />
      )}

      {editingJunction && (
        <EditExerciseSheet
          snapshot={editingJunction}
          exerciseName={editingJunction.name || editingJunction.exerciseTemplate?.name || 'Exercício'}
          sourceDeleted={editingJunction.exerciseTemplate == null}
          onSubmit={handleSubmitExerciseOverrides}
          onClose={() => setEditingExerciseId(null)}
          onLightDiscard={() => showToast('Alterações descartadas', 'success')}
        />
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </LibraryEditorLayout>
  );
};

TrainingTemplateEditorContent.propTypes = {
  templateId: PropTypes.string,
};

/** One component for "Novo treino único" (`/new`) and edit (`/:id`). Keyed by id so state never leaks between templates. */
const TrainingTemplateEditor = () => {
  const { id } = useParams();
  return <TrainingTemplateEditorContent key={id ?? 'new'} templateId={id} />;
};

export default TrainingTemplateEditor;
