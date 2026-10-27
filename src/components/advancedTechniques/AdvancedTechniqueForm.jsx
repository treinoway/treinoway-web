import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Lock } from 'lucide-react';
import ExerciseVideoSection from '../exerciseTemplate/ExerciseVideoSection';
import {
  EMPTY_TECHNIQUE_FORM,
  TECHNIQUE_DESCRIPTION_MAX,
  TECHNIQUE_NAME_MAX,
  techniqueToForm,
  validateTechniqueForm,
} from '../../utils/advancedTechniques';

// Notice shown instead of the save button for system techniques.
const SystemNotice = () => (
  <p className="editor-page__note type-caption">
    <Lock size={16} strokeWidth={2} aria-hidden="true" />
    Técnica pública: não pode ser editada nem excluída.
  </p>
);

// Create/edit form of a technique; `readOnly` (system techniques) disables fields and hides save.
const AdvancedTechniqueForm = ({ technique, readOnly = false, saving = false, onSubmit, onCancel, onNameChange, onDirtyChange }) => {
  const initialForm = technique ? techniqueToForm(technique) : EMPTY_TECHNIQUE_FORM;
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    onNameChange?.(form.name);
  }, [form.name, onNameChange]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validateTechniqueForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="editor-page__form" noValidate>
      <div className="editor-page__split">
        <div className="editor-page__col">
          <section className="section-card editor-page__section" aria-labelledby="technique-identity-heading">
            <h2 id="technique-identity-heading" className="editor-page__section-title type-h3">Identificação</h2>
            <div className="field">
              <label className="field-label type-caption-strong" htmlFor="technique-name">
                Nome <span aria-hidden="true" className="field-required">*</span>
              </label>
              <input
                id="technique-name"
                type="text"
                className={`input${errors.name ? ' input--error' : ''}`}
                value={form.name}
                maxLength={TECHNIQUE_NAME_MAX}
                disabled={readOnly}
                aria-invalid={!!errors.name}
                autoFocus={!technique}
                placeholder="Ex.: Negativa lenta"
                onChange={(e) => updateField('name', e.target.value)}
              />
              {errors.name && <span className="field-error type-caption" role="alert">{errors.name}</span>}
            </div>
            <div className="field">
              <label className="field-label type-caption-strong" htmlFor="technique-description">
                Descrição <span aria-hidden="true" className="field-required">*</span>
              </label>
              <textarea
                id="technique-description"
                className={`input${errors.description ? ' input--error' : ''}`}
                rows={5}
                value={form.description}
                maxLength={TECHNIQUE_DESCRIPTION_MAX}
                disabled={readOnly}
                aria-invalid={!!errors.description}
                placeholder="Como executar, quando usar, por quanto tempo…"
                onChange={(e) => updateField('description', e.target.value)}
              />
              {errors.description && <span className="field-error type-caption" role="alert">{errors.description}</span>}
            </div>
            {readOnly && <SystemNotice />}
          </section>
        </div>
        <div className="editor-page__col">
          <ExerciseVideoSection
            className="section-card editor-page__section"
            videoUrl={form.videoUrl}
            onVideoUrlChange={(value) => updateField('videoUrl', value)}
            gifUrl={form.gifUrl}
            onGifUrlChange={(value) => updateField('gifUrl', value)}
            gifError={errors.gifUrl}
            onRemoveVideo={() => updateField('videoUrl', '')}
            disabled={readOnly}
          />
          {errors.videoUrl && <span className="field-error type-caption" role="alert">{errors.videoUrl}</span>}
        </div>
      </div>

      {!readOnly && (
        <div className="editor-page__footer">
          <button type="button" onClick={onCancel} className="btn btn--secondary" disabled={saving}>Cancelar</button>
          <button type="submit" disabled={saving} className="btn btn--primary">{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      )}
    </form>
  );
};

AdvancedTechniqueForm.propTypes = {
  technique: PropTypes.object,
  readOnly: PropTypes.bool,
  saving: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onNameChange: PropTypes.func,
  onDirtyChange: PropTypes.func,
};

export default AdvancedTechniqueForm;
