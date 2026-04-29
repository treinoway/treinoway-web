import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Check,
  ChevronDown,
  Library,
  Plus,
  Search,
} from 'lucide-react';
import VideoField from './VideoField';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';
import { formatExerciseMeta } from '../utils/exerciseMeta';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  type: 'strength',
  sets: '',
  repetitionsMin: '',
  repetitionsMax: '',
  restInterval: '',
  videoUrl: '',
  duration: '',
  hasLoad: false,
  suggestedLoad: '',
  notes: '',
};

const buildPayload = (form) => {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    hasLoad: form.hasLoad,
  };
  if (form.videoUrl?.trim()) payload.videoUrl = form.videoUrl.trim();
  if (form.sets !== '' && form.sets != null) payload.sets = parseInt(form.sets, 10);
  if (form.repetitionsMin !== '' && form.repetitionsMax !== '') {
    payload.repetitions = {
      min: parseInt(form.repetitionsMin, 10),
      max: parseInt(form.repetitionsMax, 10),
    };
  }
  if (form.duration !== '' && form.duration != null) payload.duration = parseInt(form.duration, 10);
  if (form.restInterval !== '' && form.restInterval != null) {
    payload.restInterval = parseInt(form.restInterval, 10);
  }
  if (form.hasLoad && form.suggestedLoad !== '' && form.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(form.suggestedLoad);
  }
  if (form.notes?.trim()) payload.notes = form.notes.trim();
  return payload;
};

const snapshotToForm = (snapshot) => ({
  name: snapshot.name || snapshot.exerciseTemplate?.name || '',
  type: snapshot.type || snapshot.exerciseTemplate?.type || 'strength',
  sets: snapshot.sets ?? '',
  repetitionsMin: snapshot.repetitions?.min ?? snapshot.exerciseTemplate?.repetitions?.min ?? '',
  repetitionsMax: snapshot.repetitions?.max ?? snapshot.exerciseTemplate?.repetitions?.max ?? '',
  restInterval: snapshot.restInterval ?? snapshot.exerciseTemplate?.restInterval ?? '',
  videoUrl: snapshot.videoUrl || snapshot.exerciseTemplate?.videoUrl || '',
  duration: snapshot.duration ?? snapshot.exerciseTemplate?.duration ?? '',
  hasLoad: snapshot.hasLoad ?? snapshot.exerciseTemplate?.hasLoad ?? false,
  suggestedLoad: snapshot.suggestedLoad ?? snapshot.exerciseTemplate?.suggestedLoad ?? '',
  notes: snapshot.notes || snapshot.exerciseTemplate?.notes || '',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const LibraryPanel = ({ exerciseTemplates, selectedIds, onToggle, search, onSearch }) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exerciseTemplates;
    return exerciseTemplates.filter((t) =>
      (t.name || '').toLowerCase().includes(q)
    );
  }, [exerciseTemplates, search]);

  return (
    <div className="library-panel">
      <div className="library-search">
        <Search size={14} strokeWidth={2} aria-hidden="true" />
        <input
          className="library-search-input"
          type="text"
          placeholder="Buscar exercício na biblioteca…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Buscar exercício na biblioteca"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="library-empty">
          {search ? 'Nenhum exercício encontrado.' : 'Biblioteca vazia.'}
        </div>
      ) : (
        <div className="library-list" role="list">
          {filtered.map((tmpl) => {
            const selected = selectedIds.includes(tmpl.id);
            const meta = formatExerciseMeta(tmpl);
            return (
              <button
                key={tmpl.id}
                type="button"
                role="listitem"
                className={`library-item${selected ? ' library-item--selected' : ''}`}
                onClick={() => onToggle(tmpl.id)}
                aria-pressed={selected}
              >
                <span className="library-item-check" aria-hidden="true">
                  {selected && <Check size={12} strokeWidth={2} />}
                </span>
                <span className="library-item-body">
                  <span className="library-item-name">{tmpl.name}</span>
                  {meta && (
                    <span className="library-item-meta">
                      <span className="library-item-cat">{tmpl.type}</span>
                      {meta}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="library-selection-bar">
        <span>
          <span className="library-selection-count">{selectedIds.length}</span>
          {' '}selecionado{selectedIds.length !== 1 ? 's' : ''}
        </span>
        <span>{exerciseTemplates.length} na biblioteca</span>
      </div>
    </div>
  );
};

LibraryPanel.propTypes = {
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
};

// ─── ExerciseComposer ─────────────────────────────────────────────────────────

/**
 * Unified inline composer for creating and editing exercises within a training.
 *
 * Props:
 *   snapshot = null/undefined → create mode (Estados B / C)
 *   snapshot = object         → edit mode   (Estado D)
 */
const ExerciseComposer = ({
  snapshot,
  exerciseTemplates,
  saving,
  onSubmitCreate,
  onSubmitEdit,
  onSubmitFromLibrary,
  onCancel,
}) => {
  const isEditMode = snapshot != null;

  const [tab, setTab] = useState('create');
  const [form, setForm] = useState(() =>
    isEditMode ? snapshotToForm(snapshot) : { ...EMPTY_FORM }
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [errors, setErrors] = useState({});

  const showDuration = form.type !== 'strength';

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome obrigatório';
    if (!form.type) errs.type = 'Tipo obrigatório';
    return errs;
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onSubmitCreate(buildPayload(form));
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onSubmitEdit(snapshot.id, buildPayload(form));
  };

  const handleImport = () => {
    if (selectedTemplateIds.length === 0) return;
    onSubmitFromLibrary(selectedTemplateIds);
  };

  const handleToggleTemplate = (id) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Form ──────────────────────────────────────────────────────────────────

  const renderCreateForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} noValidate>
      {/* Row 1: Name + Type */}
      <div className="composer-name-type-row">
        <div>
          <label className="composer-label" htmlFor="composer-name">
            Nome <span aria-hidden="true">*</span>
          </label>
          <input
            id="composer-name"
            className="composer-input"
            type="text"
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Ex: Remada unilateral"
            required
            autoFocus={!isEditMode}
          />
          {errors.name && (
            <span className="form-error" role="alert">{errors.name}</span>
          )}
        </div>
        <div>
          <label className="composer-label" htmlFor="composer-type">
            Tipo <span aria-hidden="true">*</span>
          </label>
          <select
            id="composer-type"
            className="composer-select"
            value={form.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            required
          >
            {EXERCISE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.type && (
            <span className="form-error" role="alert">{errors.type}</span>
          )}
        </div>
      </div>

      {/* Row 2: Sets + Reps + Rest */}
      <div className="composer-sets-row">
        <div>
          <label className="composer-label" htmlFor="composer-sets">Séries</label>
          <input
            id="composer-sets"
            className="composer-input"
            type="number"
            min="1"
            value={form.sets}
            onChange={(e) => handleFieldChange('sets', e.target.value)}
            placeholder="3"
          />
        </div>
        <div>
          <label className="composer-label">Reps (min — máx)</label>
          <div className="composer-reps-pair">
            <input
              className="composer-input"
              type="number"
              min="1"
              value={form.repetitionsMin}
              onChange={(e) => handleFieldChange('repetitionsMin', e.target.value)}
              placeholder="8"
              aria-label="Repetições mínimas"
            />
            <span className="composer-reps-sep" aria-hidden="true">—</span>
            <input
              className="composer-input"
              type="number"
              min="1"
              value={form.repetitionsMax}
              onChange={(e) => handleFieldChange('repetitionsMax', e.target.value)}
              placeholder="12"
              aria-label="Repetições máximas"
            />
          </div>
        </div>
        <div>
          <label className="composer-label" htmlFor="composer-rest">Descanso (s)</label>
          <input
            id="composer-rest"
            className="composer-input"
            type="number"
            min="0"
            value={form.restInterval}
            onChange={(e) => handleFieldChange('restInterval', e.target.value)}
            placeholder="60"
          />
        </div>
      </div>

      {/* Progressive disclosure toggle */}
      <button
        type="button"
        className="composer-more-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
      >
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`composer-more-toggle-icon${showAdvanced ? ' composer-more-toggle-icon--open' : ''}`}
          aria-hidden="true"
        />
        {showAdvanced ? 'Ocultar campos avançados' : 'Mostrar mais campos'}
      </button>

      {/* Advanced fields */}
      {showAdvanced && (
        <div className="composer-advanced">
          {/* Video */}
          <VideoField
            value={form.videoUrl}
            onChange={(url) => handleFieldChange('videoUrl', url)}
          />

          {/* Duration — conditional on type */}
          <div className={showDuration ? '' : 'composer-duration-field--disabled'}>
            <label className="composer-label" htmlFor="composer-duration">
              Duração (s){' '}
              {!showDuration && (
                <span className="composer-label-hint">
                  — só para cardio, mobilidade ou alongamento
                </span>
              )}
            </label>
            <input
              id="composer-duration"
              className="composer-input"
              type="number"
              min="1"
              value={form.duration}
              onChange={(e) => handleFieldChange('duration', e.target.value)}
              placeholder={showDuration ? '60' : 'Não se aplica a exercícios de força'}
              disabled={!showDuration}
            />
          </div>

          {/* Has load + Suggested load */}
          <div className="composer-load-row">
            <label className="composer-checkbox-row">
              <input
                type="checkbox"
                checked={form.hasLoad}
                onChange={(e) => handleFieldChange('hasLoad', e.target.checked)}
              />
              Exercício com carga
            </label>
            {form.hasLoad && (
              <div>
                <label className="composer-label" htmlFor="composer-load">
                  Carga sugerida (kg)
                </label>
                <input
                  id="composer-load"
                  className="composer-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.suggestedLoad}
                  onChange={(e) => handleFieldChange('suggestedLoad', e.target.value)}
                  placeholder="Ex: 20"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="composer-label" htmlFor="composer-notes">Observações</label>
            <textarea
              id="composer-notes"
              className="composer-textarea"
              value={form.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Dica de execução, postura, foco muscular…"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="composer-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary btn-sm"
          disabled={saving}
        >
          {saving ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="inline-composer-wide">
      <div className="inline-composer-title">
        {isEditMode || tab === 'create'
          ? <Plus size={12} strokeWidth={2} aria-hidden="true" />
          : <Library size={12} strokeWidth={2} aria-hidden="true" />
        }
        {isEditMode ? 'Editar exercício' : 'Adicionar exercício'}
      </div>

      {/* Segmented toggle — only in create mode */}
      {!isEditMode && (
        <div
          className="segmented-toggle"
          role="tablist"
          aria-label="Modo de adição"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={`segmented-toggle-btn${tab === 'create' ? ' segmented-toggle-btn--active' : ''}`}
            onClick={() => setTab('create')}
          >
            Criar novo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'library'}
            className={`segmented-toggle-btn${tab === 'library' ? ' segmented-toggle-btn--active' : ''}`}
            onClick={() => setTab('library')}
          >
            Da biblioteca
          </button>
        </div>
      )}

      {/* Content by mode */}
      {isEditMode && renderCreateForm(handleSubmitEdit, 'Salvar alterações')}

      {!isEditMode && tab === 'create' && renderCreateForm(handleSubmitCreate, 'Salvar exercício')}

      {!isEditMode && tab === 'library' && (
        <>
          <LibraryPanel
            exerciseTemplates={exerciseTemplates}
            selectedIds={selectedTemplateIds}
            onToggle={handleToggleTemplate}
            search={librarySearch}
            onSearch={setLibrarySearch}
          />
          <div className="composer-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleImport}
              disabled={saving || selectedTemplateIds.length === 0}
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              {saving
                ? 'Adicionando…'
                : selectedTemplateIds.length === 0
                ? 'Importar'
                : `Importar ${selectedTemplateIds.length}`}
            </button>
          </div>
        </>
      )}

    </div>
  );
};

ExerciseComposer.propTypes = {
  snapshot: PropTypes.object,
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  saving: PropTypes.bool.isRequired,
  onSubmitCreate: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  onSubmitFromLibrary: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

ExerciseComposer.defaultProps = {
  snapshot: null,
};

export default ExerciseComposer;
