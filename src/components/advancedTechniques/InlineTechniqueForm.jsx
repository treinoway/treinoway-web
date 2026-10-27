import { useState } from 'react';
import PropTypes from 'prop-types';
import { createAdvancedTechnique } from '../../api/advancedTechniques';
import { translateError } from '../../i18n';
import {
  EMPTY_TECHNIQUE_FORM,
  TECHNIQUE_DESCRIPTION_MAX,
  TECHNIQUE_NAME_MAX,
  buildTechniquePayload,
  validateTechniqueForm,
} from '../../utils/advancedTechniques';

// Labelled input/textarea with its inline error.
const FormField = ({ id, label, error, multiline = false, ...inputProps }) => {
  const Control = multiline ? 'textarea' : 'input';
  return (
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
      <Control id={id} className={`input${error ? ' input--error' : ''}`} aria-invalid={!!error} {...inputProps} />
      {error && <span className="field-error type-caption" role="alert">{error}</span>}
    </div>
  );
};

FormField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  multiline: PropTypes.bool,
};

/** Small form to create a technique in place; calls `onCreated(technique)` after POST succeeds. */
const InlineTechniqueForm = ({ idPrefix, onCreated, onCancel }) => {
  const [form, setForm] = useState(EMPTY_TECHNIQUE_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const found = validateTechniqueForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSubmitError('');
    try {
      onCreated(await createAdvancedTechnique(buildTechniquePayload(form)));
    } catch (error) {
      setSubmitError(error.userMessage || translateError(error));
      setSaving(false);
    }
  };

  // why: this form sits inside the host <form>, so Enter in a text input must submit here, not there
  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.target.tagName !== 'INPUT') return;
    event.preventDefault();
    handleSubmit();
  };

  return (
    <div role="group" aria-label="Nova técnica" className="technique-inline-form" onKeyDown={handleKeyDown}>
      <FormField id={`${idPrefix}-name`} label="Nome da técnica" value={form.name} maxLength={TECHNIQUE_NAME_MAX} error={errors.name} onChange={updateField('name')} placeholder="Ex.: Negativa lenta" />
      <FormField id={`${idPrefix}-description`} label="Descrição da técnica" multiline rows={3} value={form.description} maxLength={TECHNIQUE_DESCRIPTION_MAX} error={errors.description} onChange={updateField('description')} placeholder="Como executar, quando usar, por quanto tempo…" />
      <FormField id={`${idPrefix}-video`} label="Link do vídeo (opcional)" type="url" value={form.videoUrl} error={errors.videoUrl} onChange={updateField('videoUrl')} placeholder="https://youtube.com/..." />
      <FormField id={`${idPrefix}-gif`} label="Link do GIF (opcional)" type="url" value={form.gifUrl} error={errors.gifUrl} onChange={updateField('gifUrl')} placeholder="https://.../tecnica.gif" />
      {submitError && <p className="field-error type-body" role="alert">{submitError}</p>}
      <div className="technique-inline-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Criando…' : 'Criar técnica'}
        </button>
      </div>
    </div>
  );
};

InlineTechniqueForm.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default InlineTechniqueForm;
