import PropTypes from 'prop-types';
import Select from '../Select';
import Toggle from '../ds/Toggle';
import { TRAINING_CATEGORY_OPTIONS } from '../../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS } from '../../constants/bodySegments';

/** "Informações" section of the Treino único editor: name, description, category, segment, visibility. */
const TrainingTemplateFields = ({ formData, errors = {}, disabled = false, canSetVisibility = false, onChange }) => (
  <section className="section-card editor-page__section" aria-labelledby="tt-info-heading">
    <h2 id="tt-info-heading" className="editor-page__section-title type-h3">Informações</h2>

    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="tt-name">Nome</label>
      <input
        id="tt-name"
        type="text"
        className={`input${errors.name ? ' input--error' : ''}`}
        value={formData.name}
        onChange={(e) => onChange('name', e.target.value)}
        placeholder="Ex.: Treino A — peito e tríceps"
        disabled={disabled}
        aria-invalid={!!errors.name}
      />
      {errors.name && <span className="field-error type-caption" role="alert">{errors.name}</span>}
    </div>

    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="tt-description">Descrição</label>
      <textarea
        id="tt-description"
        className="input"
        rows={3}
        value={formData.description}
        onChange={(e) => onChange('description', e.target.value)}
        disabled={disabled}
      />
    </div>

    <div className="editor-page__grid">
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="tt-category">Categoria</label>
        <Select
          id="tt-category"
          value={formData.category}
          onChange={(e) => onChange('category', e.target.value)}
          disabled={disabled}
          required
        >
          <option value="">Selecione...</option>
          {TRAINING_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        {errors.category && <span className="field-error type-caption" role="alert">{errors.category}</span>}
      </div>

      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="tt-body-segment">Segmento corporal</label>
        <Select
          id="tt-body-segment"
          value={formData.bodySegment}
          onChange={(e) => onChange('bodySegment', e.target.value)}
          disabled={disabled}
        >
          <option value="">Selecione...</option>
          {BODY_SEGMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>
    </div>

    {canSetVisibility && (
    <div className="visibility-row">
      <div className="visibility-row__text">
        <span className="type-body-strong" id="tt-public-title">Tornar este modelo público</span>
        <span className="type-caption visibility-row__hint" id="tt-public-hint">
          Outros treinadores podem usar este treino na biblioteca compartilhada.
        </span>
      </div>
      <Toggle
        checked={formData.isPublic}
        onChange={(value) => onChange('isPublic', value)}
        label="Tornar este modelo público"
        describedBy="tt-public-hint"
        disabled={disabled}
      />
    </div>
    )}
  </section>
);

TrainingTemplateFields.propTypes = {
  formData: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    bodySegment: PropTypes.string,
    isPublic: PropTypes.bool,
  }).isRequired,
  errors: PropTypes.shape({ name: PropTypes.string, category: PropTypes.string }),
  disabled: PropTypes.bool,
  /** Only admins can make a template public. */
  canSetVisibility: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default TrainingTemplateFields;
