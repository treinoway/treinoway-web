import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryEditorLayout from '../../components/LibraryEditorLayout';
import AdvancedTechniqueForm from '../../components/advancedTechniques/AdvancedTechniqueForm';
import { useToast } from '../../contexts/ToastContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useAdvancedTechniqueRecord from '../../hooks/useAdvancedTechniqueRecord';
import { createAdvancedTechnique, updateAdvancedTechnique } from '../../api/advancedTechniques';
import { translateError } from '../../i18n';
import { buildTechniquePayload } from '../../utils/advancedTechniques';

const LIST_PATH = '/trainer/advanced-techniques';

// Editor body for one technique (create or edit), keyed by id by the wrapper.
const AdvancedTechniqueEditorContent = ({ techniqueId }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const record = useAdvancedTechniqueRecord(techniqueId);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [liveName, setLiveName] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleLeave = () => {
    if (!isDirty) {
      navigate(LIST_PATH);
      return;
    }
    requestConfirm({
      message: 'Descartar alterações? As mudanças feitas nesta técnica ainda não foram salvas.',
      confirmLabel: 'Descartar',
      onConfirm: () => navigate(LIST_PATH),
    });
  };

  const handleSubmit = async (form) => {
    setSaving(true);
    try {
      if (techniqueId) await updateAdvancedTechnique(techniqueId, buildTechniquePayload(form, { isEdit: true }));
      else await createAdvancedTechnique(buildTechniquePayload(form));
      showToast(techniqueId ? 'Técnica atualizada com sucesso!' : 'Técnica criada com sucesso!', 'success');
      navigate(LIST_PATH);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      setSaving(false);
    }
  };

  const fallbackTitle = techniqueId ? 'Técnica sem nome' : 'Nova técnica';

  return (
    <LibraryEditorLayout
      title={liveName.trim() || fallbackTitle}
      state={record.status}
      loadingLabel="Carregando técnica"
      errorTitle="Não foi possível carregar a técnica"
      errorDescription={record.loadError}
      notFound={{
        title: 'Técnica não encontrada',
        description: 'Ela pode ter sido excluída ou o link está incorreto.',
        actionLabel: 'Voltar para técnicas',
      }}
      onBack={handleLeave}
      onRetry={record.retry}
    >
      <AdvancedTechniqueForm
        technique={record.technique}
        readOnly={!!record.technique?.isSystem}
        saving={saving}
        onSubmit={handleSubmit}
        onCancel={handleLeave}
        onNameChange={setLiveName}
        onDirtyChange={setIsDirty}
      />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </LibraryEditorLayout>
  );
};

AdvancedTechniqueEditorContent.propTypes = {
  techniqueId: PropTypes.string,
};

/** One component for "Nova técnica" (`/new`) and edit (`/:id`). Keyed by id so state never leaks between techniques. */
const AdvancedTechniqueEditor = () => {
  const { id } = useParams();
  return <AdvancedTechniqueEditorContent key={id ?? 'new'} techniqueId={id} />;
};

export default AdvancedTechniqueEditor;
