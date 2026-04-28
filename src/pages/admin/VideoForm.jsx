import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import Select from '../../components/Select';
import { TRAINING_CATEGORY_OPTIONS } from '../../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS } from '../../constants/bodySegments';

const EMPTY_VALUES = {
  title: '',
  description: '',
  url: '',
  thumbnailUrl: '',
  duration: '',
  category: '',
  bodySegment: '',
  tags: [],
};

const buildPayload = (values) => {
  const payload = {
    title: values.title.trim(),
    url: values.url.trim(),
    category: values.category,
  };
  if (values.description?.trim()) payload.description = values.description.trim();
  if (values.thumbnailUrl?.trim()) payload.thumbnailUrl = values.thumbnailUrl.trim();
  if (values.duration !== '' && values.duration != null) {
    payload.duration = parseInt(values.duration, 10);
  }
  if (values.bodySegment) payload.bodySegment = values.bodySegment;
  payload.tags = Array.isArray(values.tags) ? values.tags : [];
  return payload;
};

const buildInitialState = (initialValues) => ({
  ...EMPTY_VALUES,
  ...(initialValues || {}),
  description: initialValues?.description ?? '',
  thumbnailUrl: initialValues?.thumbnailUrl ?? '',
  duration: initialValues?.duration ?? '',
  bodySegment: initialValues?.bodySegment ?? '',
  tags: Array.isArray(initialValues?.tags) ? initialValues.tags : [],
});

const VideoForm = ({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  fieldErrors,
}) => {
  const [values, setValues] = useState(() => buildInitialState(initialValues));
  const [tagDraft, setTagDraft] = useState('');

  const errorByField = useMemo(() => {
    if (!Array.isArray(fieldErrors)) return {};
    return fieldErrors.reduce((acc, detail) => {
      if (detail?.field) acc[detail.field] = detail.message || detail.messageCode;
      return acc;
    }, {});
  }, [fieldErrors]);

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const next = tagDraft.trim();
    if (!next) return;
    setValues((prev) => {
      if (prev.tags.includes(next)) return prev;
      return { ...prev, tags: [...prev.tags, next] };
    });
    setTagDraft('');
  };

  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTag();
    } else if (event.key === 'Backspace' && tagDraft === '' && values.tags.length > 0) {
      setValues((prev) => ({ ...prev, tags: prev.tags.slice(0, -1) }));
    }
  };

  const handleRemoveTag = (tag) => {
    setValues((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    onSubmit(buildPayload(values));
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && (
        <div className="form-error" role="alert">{error}</div>
      )}

      <div>
        <label className="form-label" htmlFor="vf-title">
          Título <span aria-hidden="true" className="form-required">*</span>
        </label>
        <input
          id="vf-title"
          type="text"
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          className={`form-input${errorByField.title ? ' form-input--error' : ''}`}
          required
          autoFocus
          disabled={isSubmitting}
        />
        {errorByField.title && (
          <span className="form-error" role="alert">{errorByField.title}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-description">Descrição</label>
        <textarea
          id="vf-description"
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          rows={3}
          className={`form-textarea${errorByField.description ? ' form-input--error' : ''}`}
          placeholder="Detalhes sobre o vídeo (opcional)"
          disabled={isSubmitting}
        />
        {errorByField.description && (
          <span className="form-error" role="alert">{errorByField.description}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-url">
          URL do vídeo <span aria-hidden="true" className="form-required">*</span>
        </label>
        <input
          id="vf-url"
          type="url"
          value={values.url}
          onChange={(event) => updateField('url', event.target.value)}
          className={`form-input${errorByField.url ? ' form-input--error' : ''}`}
          required
          placeholder="https://..."
          disabled={isSubmitting}
        />
        {errorByField.url && (
          <span className="form-error" role="alert">{errorByField.url}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-thumbnailUrl">URL da miniatura</label>
        <input
          id="vf-thumbnailUrl"
          type="url"
          value={values.thumbnailUrl}
          onChange={(event) => updateField('thumbnailUrl', event.target.value)}
          className={`form-input${errorByField.thumbnailUrl ? ' form-input--error' : ''}`}
          placeholder="https://..."
          disabled={isSubmitting}
        />
        {errorByField.thumbnailUrl && (
          <span className="form-error" role="alert">{errorByField.thumbnailUrl}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-duration">Duração (segundos)</label>
        <input
          id="vf-duration"
          type="number"
          min="0"
          value={values.duration}
          onChange={(event) => updateField('duration', event.target.value)}
          className={`form-input${errorByField.duration ? ' form-input--error' : ''}`}
          placeholder="Ex: 90"
          disabled={isSubmitting}
        />
        {errorByField.duration && (
          <span className="form-error" role="alert">{errorByField.duration}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-category">
          Categoria <span aria-hidden="true" className="form-required">*</span>
        </label>
        <Select
          id="vf-category"
          value={values.category}
          onChange={(event) => updateField('category', event.target.value)}
          required
          disabled={isSubmitting}
        >
          <option value="">Selecione...</option>
          {TRAINING_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        {errorByField.category && (
          <span className="form-error" role="alert">{errorByField.category}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-bodySegment">Segmento corporal</label>
        <Select
          id="vf-bodySegment"
          value={values.bodySegment}
          onChange={(event) => updateField('bodySegment', event.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Sem segmento</option>
          {BODY_SEGMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        {errorByField.bodySegment && (
          <span className="form-error" role="alert">{errorByField.bodySegment}</span>
        )}
      </div>

      <div>
        <label className="form-label" htmlFor="vf-tags">Tags</label>
        <div className="tag-chip-input">
          {values.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
              <button
                type="button"
                className="tag-chip__remove"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remover tag ${tag}`}
                disabled={isSubmitting}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
          <input
            id="vf-tags"
            type="text"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={handleAddTag}
            className="tag-chip-input__field"
            placeholder={values.tags.length === 0 ? 'Pressione Enter para adicionar' : ''}
            aria-label="Adicionar tag"
            disabled={isSubmitting}
          />
        </div>
        {errorByField.tags && (
          <span className="form-error" role="alert">{errorByField.tags}</span>
        )}
      </div>

      <div className="btn-group">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : submitLabel}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

VideoForm.propTypes = {
  initialValues: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    url: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    duration: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    category: PropTypes.string,
    bodySegment: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }),
  submitLabel: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  error: PropTypes.string,
  fieldErrors: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string,
      message: PropTypes.string,
      messageCode: PropTypes.string,
    })
  ),
};

export default VideoForm;
