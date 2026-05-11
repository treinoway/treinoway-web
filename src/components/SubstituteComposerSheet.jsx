import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { t } from '../i18n';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';

const interpolate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );

const buildInitialForm = (principal) => ({
  name: '',
  type: principal?.type || '',
  sets: principal?.sets ?? '',
  repetitionsMin: principal?.repetitions?.min ?? '',
  repetitionsMax: principal?.repetitions?.max ?? '',
  hasLoad: principal?.hasLoad || false,
  suggestedLoad: principal?.suggestedLoad ?? '',
  restInterval: principal?.restInterval ?? '',
});

const buildPayload = (form) => {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    hasLoad: form.hasLoad,
    prescriptionMode: 'reps',
  };
  if (form.sets !== '' && form.sets != null) payload.sets = parseInt(form.sets, 10);
  if (
    form.repetitionsMin !== '' && form.repetitionsMin != null
    && form.repetitionsMax !== '' && form.repetitionsMax != null
  ) {
    payload.repetitions = {
      min: parseInt(form.repetitionsMin, 10),
      max: parseInt(form.repetitionsMax, 10),
    };
  }
  if (form.restInterval !== '' && form.restInterval != null) {
    payload.restInterval = parseInt(form.restInterval, 10);
  }
  if (form.hasLoad && form.suggestedLoad !== '' && form.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(form.suggestedLoad);
  }
  return payload;
};

/**
 * Bottom-sheet form to add a substitute under an existing principal
 * exercise. Calls `POST /trainer/exercises/:principalId/substitutes`
 * with the same body shape as a regular exercise (no supersetGroupId,
 * no order). The composer prefills prescription fields from the principal
 * so the trainer only has to type the new exercise name.
 *
 * On success, calls `onCreated(newSubstitute)` then closes.
 */
const SubstituteComposerSheet = ({ open, principal = null, onClose, onCreated }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState(() => buildInitialForm(principal));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  if (!open) return null;

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError('Informe o nome do exercício.');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const res = await api.post(
        `/trainer/exercises/${principal.id}/substitutes`,
        buildPayload(form)
      );
      showToast(t('substitute.addedToast') || 'Substituto adicionado.', 'success');
      onCreated(res.data);
      onClose();
    } catch (err) {
      showToast(err.userMessage || 'Erro ao adicionar substituto.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const title = t('substitute.composerTitle') || 'Adicionar substituto';
  const placeholder = interpolate(
    t('substitute.composerNamePlaceholder') || 'Nome do exercício',
    {}
  );

  return (
    <div className="overlay" onClick={() => !saving && onClose()}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{title}</h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <form className="bottom-sheet-body form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="substitute-name">
              Nome <span aria-hidden="true">*</span>
            </label>
            <input
              id="substitute-name"
              className={`form-input${nameError ? ' form-input--error' : ''}`}
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              placeholder={placeholder}
              required
              autoFocus
              disabled={saving}
            />
            {nameError && (
              <span className="form-error" role="alert">{nameError}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="substitute-type">
              Tipo
            </label>
            <select
              id="substitute-type"
              className="form-select"
              value={form.type}
              onChange={(e) => handleField('type', e.target.value)}
              disabled={saving}
            >
              <option value="">—</option>
              {EXERCISE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="substitute-sets">Séries</label>
            <input
              id="substitute-sets"
              type="number"
              className="form-input"
              value={form.sets}
              onChange={(e) => handleField('sets', e.target.value)}
              min="1"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="substitute-reps-min">Reps (mín)</label>
            <input
              id="substitute-reps-min"
              type="number"
              className="form-input"
              value={form.repetitionsMin}
              onChange={(e) => handleField('repetitionsMin', e.target.value)}
              min="1"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="substitute-reps-max">Reps (máx)</label>
            <input
              id="substitute-reps-max"
              type="number"
              className="form-input"
              value={form.repetitionsMax}
              onChange={(e) => handleField('repetitionsMax', e.target.value)}
              min="1"
              disabled={saving}
            />
          </div>

          <div className="form-group checkbox-row">
            <input
              id="substitute-has-load"
              type="checkbox"
              checked={form.hasLoad}
              onChange={(e) => handleField('hasLoad', e.target.checked)}
              disabled={saving}
            />
            <label className="form-label" htmlFor="substitute-has-load">
              Carga
            </label>
          </div>

          {form.hasLoad && (
            <div className="form-group">
              <label className="form-label" htmlFor="substitute-load">Carga sugerida (kg)</label>
              <input
                id="substitute-load"
                type="number"
                className="form-input"
                value={form.suggestedLoad}
                onChange={(e) => handleField('suggestedLoad', e.target.value)}
                min="0"
                step="0.5"
                disabled={saving}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="substitute-rest">Descanso (s)</label>
            <input
              id="substitute-rest"
              type="number"
              className="form-input"
              value={form.restInterval}
              onChange={(e) => handleField('restInterval', e.target.value)}
              min="0"
              disabled={saving}
            />
          </div>

          <div className="btn-group">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Carregando...' : 'Salvar'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

SubstituteComposerSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  principal: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    sets: PropTypes.number,
    repetitions: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number,
    }),
    hasLoad: PropTypes.bool,
    suggestedLoad: PropTypes.number,
    restInterval: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

export default SubstituteComposerSheet;
