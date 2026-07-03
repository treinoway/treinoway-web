import { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Check,
  Library,
  Loader,
  Plus,
  Search,
} from 'lucide-react';
import useExerciseTemplateSearch from '../hooks/useExerciseTemplateSearch';
import PrescriptionField from './PrescriptionField';
import IntensityField from './IntensityField';
import VideoField from './VideoField';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel, getLoadDefault } from '../constants/exerciseTypes';
import { t } from '../i18n';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

// ─── Constants ────────────────────────────────────────────────────────────────

const REST_CHIPS = [60, 90, 120, 180];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: '',
  repetitionsMin: '',
  repetitionsMax: '',
  restInterval: '',
  videoUrl: '',
  duration: '',
  hasLoad: true,
  suggestedLoad: '',
  notes: '',
  intensity: null,
};

const buildPayload = (form) => {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    hasLoad: form.hasLoad,
    prescriptionMode: form.prescriptionMode,
  };
  payload.videoUrl = form.videoUrl?.trim() ? form.videoUrl.trim() : null;
  if (form.sets !== '' && form.sets != null) payload.sets = parseInt(form.sets, 10);
  if (form.prescriptionMode === 'duration') {
    if (form.duration !== '' && form.duration != null) {
      payload.duration = parseInt(form.duration, 10);
    }
  } else if (form.repetitionsMin !== '' && form.repetitionsMax !== '') {
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
  if (form.notes?.trim()) payload.notes = form.notes.trim();
  payload.intensity = form.type === 'cardio' ? (form.intensity || null) : null;
  return payload;
};

const snapshotToForm = (snapshot) => ({
  name: snapshot.name || snapshot.exerciseTemplate?.name || '',
  type: snapshot.type || snapshot.exerciseTemplate?.type || 'strength',
  prescriptionMode: snapshot.prescriptionMode ?? snapshot.exerciseTemplate?.prescriptionMode ?? 'reps',
  sets: snapshot.sets ?? '',
  repetitionsMin: snapshot.repetitions?.min ?? snapshot.exerciseTemplate?.repetitions?.min ?? '',
  repetitionsMax: snapshot.repetitions?.max ?? snapshot.exerciseTemplate?.repetitions?.max ?? '',
  restInterval: snapshot.restInterval ?? snapshot.exerciseTemplate?.restInterval ?? '',
  videoUrl: snapshot.videoUrl ?? '',
  duration: snapshot.duration ?? snapshot.exerciseTemplate?.duration ?? '',
  hasLoad: snapshot.hasLoad ?? snapshot.exerciseTemplate?.hasLoad ?? false,
  suggestedLoad: snapshot.suggestedLoad ?? snapshot.exerciseTemplate?.suggestedLoad ?? '',
  notes: snapshot.notes || snapshot.exerciseTemplate?.notes || '',
  intensity: snapshot.intensity ?? snapshot.exerciseTemplate?.intensity ?? null,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * LibraryPanel — server-search edition.
 *
 * When the search box is empty it shows the `initialTemplates` (the cached
 * first-100 list from useProtocolBuilder). When the user types, it fires a
 * debounced GET /trainer/exercise-templates?q=… so the full library is
 * reachable regardless of the 100-item initial cap.
 *
 * `seenMap` (from useExerciseTemplateSearch) accumulates every template ever
 * shown, so `onToggle` / import can resolve selected ids even after the query
 * changes.
 */
const LibraryPanel = ({ initialTemplates, selectedIds, onToggle }) => {
  const { results, staleResults, searching, showSpinner, query, setQuery, seenMap } = useExerciseTemplateSearch(initialTemplates);

  const hasQuery = query.trim().length > 0;

  // While a fetch is in flight, keep showing stale results so the list never
  // blanks out mid-keystroke. Only fall back to empty once results arrive.
  const displayList = hasQuery
    ? (searching ? (staleResults ?? results ?? []) : (results ?? []))
    : initialTemplates;

  const emptyMessage = hasQuery ? 'Nenhum exercício encontrado.' : 'Biblioteca vazia.';

  // Total count shown in the footer: use seenMap size when a query is active
  // (it reflects all unique templates discovered so far), otherwise show initial count.
  const libraryCount = hasQuery ? seenMap.size : initialTemplates.length;

  return (
    <div className="library-panel">
      <div className="library-search">
        <Search size={14} strokeWidth={2} aria-hidden="true" />
        <input
          className="library-search-input"
          type="text"
          placeholder="Buscar exercício na biblioteca…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar exercício na biblioteca"
        />
        {showSpinner && (
          <Loader size={14} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
        )}
      </div>

      {showSpinner && displayList.length === 0 ? (
        <div className="library-empty">Buscando…</div>
      ) : displayList.length === 0 ? (
        <div className="library-empty">{emptyMessage}</div>
      ) : (
        <div className="library-list" role="list">
          {displayList.map((tmpl) => {
            const selected = selectedIds.includes(tmpl.id);
            const typeLabel = tmpl.type ? getExerciseTypeLabel(tmpl.type) : null;
            return (
              <button
                key={tmpl.id}
                type="button"
                role="listitem"
                className={`library-item${selected ? ' library-item--selected' : ''}`}
                onClick={() => onToggle(tmpl.id, seenMap)}
                aria-pressed={selected}
              >
                <span className="library-item-check" aria-hidden="true">
                  {selected && <Check size={12} strokeWidth={2} />}
                </span>
                <span className="library-item-body">
                  <span className="library-item-name">{tmpl.name}</span>
                  {typeLabel && (
                    <span className="library-item-meta">
                      <span className="library-item-cat">{typeLabel}</span>
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
        <span>{libraryCount} na biblioteca</span>
      </div>
    </div>
  );
};

LibraryPanel.propTypes = {
  initialTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
};

// ─── ExerciseComposer ─────────────────────────────────────────────────────────

/**
 * Unified inline composer for creating and editing exercises within a training.
 *
 * Props:
 *   snapshot = null/undefined → create mode
 *   snapshot = object         → edit mode
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
  // Tracks whether the user has manually toggled carga (overrides type-derived default)
  const [loadManuallySet, setLoadManuallySet] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  // Resolved template objects for the current selection, keyed by id. Populated
  // from LibraryPanel's seenMap on toggle so the full template (name, type,
  // prescription…) survives even when the paginated/searched template is not
  // present in the `exerciseTemplates` initial-list prop.
  const [selectedTemplatesById, setSelectedTemplatesById] = useState({});
  const [errors, setErrors] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // When type changes, derive hasLoad default unless user has manually overridden
      if (field === 'type' && !loadManuallySet) {
        next.hasLoad = getLoadDefault(value);
      }

      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleLoadToggle = (checked) => {
    setLoadManuallySet(true);
    setForm((prev) => ({ ...prev, hasLoad: checked }));
  };

  const handlePrescriptionChange = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleIntensityChange = (value) => {
    setForm((prev) => ({ ...prev, intensity: value }));
  };

  const handleIntensityClear = () => {
    setForm((prev) => ({ ...prev, intensity: null }));
  };

  const handleKeepCardio = () => {
    setForm((prev) => ({ ...prev, type: 'cardio' }));
  };

  const handleRestChipClick = (seconds) => {
    setForm((prev) => ({ ...prev, restInterval: String(seconds) }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome obrigatório';
    if (!form.type) errs.type = 'Tipo obrigatório';
    return errs;
  };

  const checkPrescriptionEmpty = () => {
    if (form.prescriptionMode === 'duration') {
      return !form.duration || String(form.duration).trim() === '';
    }
    return (
      String(form.repetitionsMin ?? '').trim() === '' &&
      String(form.repetitionsMax ?? '').trim() === ''
    );
  };

  const doSaveCreate = () => {
    setConfirmDialog(null);
    setErrors({});
    onSubmitCreate(buildPayload(form));
  };

  const doSaveEdit = () => {
    setConfirmDialog(null);
    setErrors({});
    onSubmitEdit(snapshot.id, buildPayload(form));
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (checkPrescriptionEmpty()) {
      const warnKey = form.prescriptionMode === 'duration' ? 'duration' : 'reps';
      setConfirmDialog({
        message: t(`exercise.prescriptionWarn.${warnKey}`),
        onConfirm: doSaveCreate,
      });
      return;
    }
    setErrors({});
    onSubmitCreate(buildPayload(form));
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (checkPrescriptionEmpty()) {
      const warnKey = form.prescriptionMode === 'duration' ? 'duration' : 'reps';
      setConfirmDialog({
        message: t(`exercise.prescriptionWarn.${warnKey}`),
        onConfirm: doSaveEdit,
      });
      return;
    }
    setErrors({});
    onSubmitEdit(snapshot.id, buildPayload(form));
  };

  const handleImport = () => {
    if (selectedTemplateIds.length === 0) return;
    onSubmitFromLibrary(selectedTemplateIds, selectedTemplatesById);
  };

  // seenMap is passed from LibraryPanel so selection always resolves even when
  // the query changes and the template is no longer in the visible list. We
  // capture the resolved template object here (not just the id) so callers can
  // use it as the source of truth instead of re-deriving from a possibly-stale
  // paginated `exerciseTemplates` list.
  const handleToggleTemplate = (id, seenMap) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    const resolved = seenMap?.get(id);
    if (resolved) {
      setSelectedTemplatesById((prev) => ({ ...prev, [id]: resolved }));
    }
  };

  const activeRestChip = REST_CHIPS.includes(Number(form.restInterval))
    ? Number(form.restInterval)
    : null;

  // ── Create/edit form ──────────────────────────────────────────────────────

  const renderCreateForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} noValidate>

      {/* ── Band 1: O ESSENCIAL ── */}
      <div className="composer-band">
        <span className="composer-band-label">O Essencial</span>

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

        <IntensityField
          idPrefix="composer"
          type={form.type}
          intensity={form.intensity}
          options={EXERCISE_INTENSITY_OPTIONS}
          onChange={handleIntensityChange}
          onClear={handleIntensityClear}
          onKeepCardio={handleKeepCardio}
        />
      </div>

      {/* ── Band 2: PRESCRIÇÃO ── */}
      <div className="composer-band">
        <span className="composer-band-label">Prescrição</span>

        <PrescriptionField
          idPrefix="composer"
          formData={form}
          onChange={handlePrescriptionChange}
        />

        {/* Descanso + Carga — side-by-side on desktop, stacked on mobile */}
        <div className="composer-carga-rest-row">
          {/* Descanso — chips + suffix input */}
          <div className="composer-rest-group">
            <label className="composer-label" htmlFor="composer-rest">Descanso</label>
            <div
              className="prescription-chips"
              role="group"
              aria-label="Atalhos de descanso"
            >
              {REST_CHIPS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className={`prescription-chip${activeRestChip === seconds ? ' prescription-chip--active' : ''}`}
                  onClick={() => handleRestChipClick(seconds)}
                  aria-pressed={activeRestChip === seconds}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <div className="form-input-with-suffix">
              <input
                id="composer-rest"
                className="composer-input"
                type="number"
                min="0"
                value={form.restInterval}
                onChange={(e) => handleFieldChange('restInterval', e.target.value)}
                placeholder="90"
                aria-label="Intervalo de descanso em segundos"
              />
              <span className="form-input-suffix" aria-hidden="true">s</span>
            </div>
          </div>

          {/* Carga — toggle + optional kg reveal */}
          <div className="composer-load-col">
            <div className="composer-load-toggle-row">
              <span className="composer-load-toggle-label" id="composer-load-label">
                Exercício com carga
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  role="switch"
                  aria-labelledby="composer-load-label"
                  checked={form.hasLoad}
                  onChange={(e) => handleLoadToggle(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>

            {/* Carga kg input — reveals only when hasLoad */}
            {form.hasLoad && (
              <div className="composer-load-reveal">
                <label className="composer-label" htmlFor="composer-load">
                  Carga sugerida
                </label>
                <div className="form-input-with-suffix">
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
                  <span className="form-input-suffix" aria-hidden="true">kg</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Band 3: DETALHES ── */}
      <div className="composer-band">
        <span className="composer-band-label">Detalhes</span>

        {/* Vídeo — library picker + YouTube URL fallback */}
        <VideoField
          value={form.videoUrl}
          onChange={(url) => handleFieldChange('videoUrl', url)}
          label="Vídeo de demonstração"
        />

        {/* Observações — uncapped */}
        <div>
          <label className="composer-label" htmlFor="composer-notes">Observações</label>
          <textarea
            id="composer-notes"
            className="composer-textarea"
            value={form.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Dica de execução, postura, foco muscular…"
            rows={3}
            aria-label="Observações"
          />
        </div>
      </div>

      {/* ── Footer ── */}
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
          className="segmented-toggle segmented-toggle--compact"
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
            initialTemplates={exerciseTemplates}
            selectedIds={selectedTemplateIds}
            onToggle={handleToggleTemplate}
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

      {confirmDialog && createPortal(
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={confirmDialog.onConfirm}
              >
                {t('exercise.prescriptionWarn.confirm')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                {t('exercise.prescriptionWarn.cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
