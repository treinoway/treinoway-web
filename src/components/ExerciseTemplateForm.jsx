import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import VideoLibraryPicker from './VideoLibraryPicker';
import ConfirmDialog from './ds/ConfirmDialog';
import ExerciseIdentitySection from './exerciseTemplate/ExerciseIdentitySection';
import ExerciseVideoSection from './exerciseTemplate/ExerciseVideoSection';
import ExerciseVisibilitySection from './exerciseTemplate/ExerciseVisibilitySection';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const EMPTY_FORM = {
  name: '',
  type: 'strength',
  videoUrl: '',
  isPublic: false,
};

const buildPayload = (data, { includeVisibility }) => {
  const payload = { name: data.name, type: data.type };
  if (includeVisibility) payload.isPublic = data.isPublic;
  if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
  return payload;
};

const buildInitialForm = (template) => {
  if (!template) return EMPTY_FORM;
  return {
    name: template.name || '',
    type: template.type || '',
    videoUrl: template.videoUrl || '',
    isPublic: template.isPublic || false,
  };
};

/**
 * Create/edit form of an exercise template (one component for both).
 * `variant="page"` renders each section as a `section-card` (editor page); the default
 * `"sheet"` renders them flat inside a bottom sheet. `onDirtyChange(bool)` reports unsaved edits.
 */
const ExerciseTemplateForm = ({ exerciseTemplate, onSuccess, onCancel, onNameChange, onDirtyChange, variant = 'sheet', isAdmin = false }) => {
  const { showToast } = useToast();
  const initialForm = useMemo(() => buildInitialForm(exerciseTemplate), [exerciseTemplate]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [nameError, setNameError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [publicConfirmedThisSession, setPublicConfirmedThisSession] = useState(false);

  const isEditing = !!exerciseTemplate?.id;
  const sectionClass = variant === 'page' ? 'section-card editor-page__section' : 'editor-page__section';
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialForm);

  useEffect(() => {
    setFormData(initialForm);
    setPublicConfirmedThisSession(false);
    onNameChange?.(initialForm.name);
  }, [initialForm, onNameChange]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleNameChange = (value) => {
    updateField('name', value);
    setNameError('');
    onNameChange?.(value);
  };

  const closeDialog = () => setConfirmDialog(null);

  const handlePublicToggle = (checked) => {
    if (!checked || publicConfirmedThisSession) {
      updateField('isPublic', checked);
      return;
    }
    setConfirmDialog({
      message: 'Tornar público? Outros treinadores podem usar este exercício na biblioteca compartilhada. Você pode reverter a qualquer momento.',
      confirmTone: 'primary',
      onConfirm: () => {
        closeDialog();
        setPublicConfirmedThisSession(true);
        updateField('isPublic', true);
      },
    });
  };

  const handleRemoveVideo = () => {
    setConfirmDialog({
      message: 'Remover vídeo? O link do vídeo será removido deste exercício.',
      confirmTone: 'danger',
      onConfirm: () => {
        closeDialog();
        updateField('videoUrl', '');
      },
    });
  };

  const persist = async (payload) => {
    if (isEditing) {
      const response = await api.patch(`/trainer/exercise-templates/${exerciseTemplate.id}`, payload);
      showToast('Exercício atualizado com sucesso!', 'success');
      return response;
    }
    const response = await api.post('/trainer/exercise-templates', payload);
    showToast('Exercício criado com sucesso!', 'success');
    return response;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setNameError('Informe o nome do exercício.');
      return;
    }
    setSaving(true);
    try {
      const response = await persist(buildPayload(formData, { includeVisibility: isAdmin }));
      onSuccess?.(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="editor-page__form" noValidate>
        <div className="editor-page__split">
          <div className="editor-page__col">
          <ExerciseIdentitySection
            className={sectionClass}
            name={formData.name}
            type={formData.type}
            nameError={nameError}
            autoFocusName={!isEditing}
            onNameChange={handleNameChange}
            onTypeChange={(value) => updateField('type', value)}
          />
          {isAdmin && (
            <ExerciseVisibilitySection className={sectionClass} isPublic={formData.isPublic} onToggle={handlePublicToggle} />
          )}
          </div>
          <div className="editor-page__col">
          <ExerciseVideoSection
            className={sectionClass}
            videoUrl={formData.videoUrl}
            onVideoUrlChange={(value) => updateField('videoUrl', value)}
            onPickFromLibrary={isAdmin ? () => setPickerOpen(true) : undefined}
            onRemoveVideo={handleRemoveVideo}
          />
          </div>
        </div>

        <div className="editor-page__footer">
          <button type="button" onClick={onCancel} className="btn btn--secondary" disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn--primary">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>

      {isAdmin && (
        <VideoLibraryPicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(video) => updateField('videoUrl', video.url)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel="Confirmar"
          confirmTone={confirmDialog.confirmTone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </>
  );
};

ExerciseTemplateForm.propTypes = {
  exerciseTemplate: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  onNameChange: PropTypes.func,
  onDirtyChange: PropTypes.func,
  variant: PropTypes.oneOf(['sheet', 'page']),
  /** Only admins set visibility (`isPublic`) and pick from the video library. */
  isAdmin: PropTypes.bool,
};

export default ExerciseTemplateForm;
