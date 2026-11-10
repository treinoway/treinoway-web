import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Check,
  Library,
  Loader,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import useExerciseTemplateSearch from '../hooks/useExerciseTemplateSearch';
import PrescriptionBand, { NotesField } from './exerciseComposer/PrescriptionBand';
import PickedExercise from './exerciseComposer/PickedExercise';
import TemplateSearchCombobox from './exerciseComposer/TemplateSearchCombobox';
import Segmented from './ds/Segmented';
import ConfirmDialog from './ds/ConfirmDialog';
import IntensityField from './IntensityField';
import TechniquesBand from './exerciseComposer/TechniquesBand';
import VideoField from './VideoField';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel, getLoadDefault } from '../constants/exerciseTypes';
import { t, translateError } from '../i18n';
import { getGifUrlError } from '../utils/gif';
import { haveSameTechniqueIds, sortTechniquesByOrder, toTechniqueIds, toTechniqueRefs, withoutDeletedTechniques } from '../utils/advancedTechniques';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPOSER_FORM_ID = 'exercise-composer-form';

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
  gifUrl: '',
  videoFileKey: null,
  videoFilePreviewUrl: null,
  duration: '',
  hasLoad: true,
  suggestedLoad: '',
  notes: '',
  intensity: null,
  advancedTechniques: [],
};

// Technique part of a create/edit payload: ids (sent to the API) plus the display list (stripped by the hooks).
const buildTechniquePayload = (form, { isEdit }) => {
  const ids = toTechniqueIds(form.advancedTechniques);
  if (!isEdit && ids.length === 0) return {};
  return { advancedTechniqueIds: ids, advancedTechniques: toTechniqueRefs(withoutDeletedTechniques(form.advancedTechniques)) };
};

const buildPayload = (form, { isEdit } = {}) => {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    hasLoad: form.hasLoad,
    prescriptionMode: form.prescriptionMode,
  };
  payload.videoUrl = form.videoUrl?.trim() ? form.videoUrl.trim() : null;
  payload.gifUrl = form.gifUrl?.trim() ? form.gifUrl.trim() : null;
  payload.videoFileKey = form.videoFileKey ?? null;
  if (form.sets !== '' && form.sets != null) {
    payload.sets = parseInt(form.sets, 10);
  } else if (isEdit) {
    payload.sets = null;
  }
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
  } else if (isEdit) {
    payload.restInterval = null;
  }
  if (form.hasLoad && form.suggestedLoad !== '' && form.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(form.suggestedLoad);
  } else if (isEdit) {
    payload.suggestedLoad = null;
  }
  if (form.notes?.trim()) {
    payload.notes = form.notes.trim();
  } else if (isEdit) {
    payload.notes = '';
  }
  payload.intensity = form.type === 'cardio' ? (form.intensity || null) : null;
  return { ...payload, ...buildTechniquePayload(form, { isEdit }) };
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
  gifUrl: snapshot.gifUrl ?? snapshot.exerciseTemplate?.gifUrl ?? '',
  videoFileKey: snapshot.videoFileKey ?? null,
  videoFilePreviewUrl: snapshot.videoFileUrl ?? null,
  duration: snapshot.duration ?? snapshot.exerciseTemplate?.duration ?? '',
  hasLoad: snapshot.hasLoad ?? snapshot.exerciseTemplate?.hasLoad ?? false,
  suggestedLoad: snapshot.suggestedLoad ?? snapshot.exerciseTemplate?.suggestedLoad ?? '',
  notes: snapshot.notes || snapshot.exerciseTemplate?.notes || '',
  intensity: snapshot.intensity ?? snapshot.exerciseTemplate?.intensity ?? null,
  advancedTechniques: sortTechniquesByOrder(snapshot.advancedTechniques),
});

// Create-form starting point for a substitute: the principal's prescription with an empty name and no media or techniques.
const substitutePrefill = (principal) => ({
  ...snapshotToForm(principal),
  name: '',
  videoUrl: '',
  gifUrl: '',
  videoFileKey: null,
  videoFilePreviewUrl: null,
  notes: '',
  advancedTechniques: [],
});

// Form fields a library template actually defines (real templates often define none), to fill without clobbering typed values.
const templatePrescriptionPatch = (template, current = {}) => ({
  ...(template.prescriptionMode != null && { prescriptionMode: template.prescriptionMode }),
  ...(template.sets != null && { sets: template.sets }),
  ...(template.repetitions && { repetitionsMin: template.repetitions.min ?? '', repetitionsMax: template.repetitions.max ?? '' }),
  ...(template.duration != null && { duration: template.duration }),
  ...(template.restInterval != null && { restInterval: template.restInterval }),
  ...(template.hasLoad != null && { hasLoad: template.hasLoad }),
  ...(template.suggestedLoad != null && { suggestedLoad: template.suggestedLoad }),
  ...(template.notes && { notes: template.notes }),
  videoUrl: current.videoUrl?.trim() ? current.videoUrl : template.videoUrl ?? '',
  gifUrl: current.gifUrl?.trim() ? current.gifUrl : template.gifUrl ?? '',
  videoFileKey: current.videoFileKey ?? template.videoFileKey ?? null,
  videoFilePreviewUrl: current.videoFileKey ? current.videoFilePreviewUrl ?? null : template.videoFileUrl ?? null,
  intensity: template.type === 'cardio' ? template.intensity ?? null : null,
  advancedTechniques: sortTechniquesByOrder(template.advancedTechniques),
});

// True when a form field holds a value worth sending.
const hasValue = (value) => value !== '' && value != null;

// Reps or duration part of the from-template overrides.
const buildVolumeOverrides = (form) => {
  if (form.prescriptionMode === 'duration') {
    return hasValue(form.duration) ? { duration: parseInt(form.duration, 10) } : {};
  }
  if (!hasValue(form.repetitionsMin) || !hasValue(form.repetitionsMax)) return {};
  return { repetitions: { min: parseInt(form.repetitionsMin, 10), max: parseInt(form.repetitionsMax, 10) } };
};

// True when reps mode has only one of min/max filled (an incomplete range).
const hasPartialReps = (form) =>
  form.prescriptionMode !== 'duration' && hasValue(form.repetitionsMin) !== hasValue(form.repetitionsMax);

// Prescription overrides sent with a library exercise; `template` lets create mode build the local row.
const buildTemplateOverrides = (form, template) => {
  const volume = buildVolumeOverrides(form);
  // why: the API rejects a prescriptionMode without its volume, so the mode is only sent alongside reps or duration
  return {
    template,
    hasLoad: form.hasLoad,
    ...(template.type === 'cardio' && form.intensity && { intensity: form.intensity }),
    ...(Object.keys(volume).length > 0 && { prescriptionMode: form.prescriptionMode }),
    ...volume,
    ...buildSecondaryOverrides(form),
    ...buildTechniqueOverrides(form, template),
    ...buildMediaOverrides(form, template),
  };
};

// Media overrides: only sent when the trainer changed the inherited URL (empty clears it with null).
const buildMediaOverrides = (form, template) => {
  const toOverride = (value) => value.trim() || null;
  const changed = (key) => (form[key] ?? '').trim() !== (template[key] ?? '').trim();
  return {
    ...(changed('videoUrl') && { videoUrl: toOverride(form.videoUrl ?? '') }),
    ...(changed('gifUrl') && { gifUrl: toOverride(form.gifUrl ?? '') }),
    ...((form.videoFileKey ?? null) !== (template.videoFileKey ?? null) && { videoFileKey: form.videoFileKey ?? null }),
  };
};

// Technique overrides: only sent when the trainer changed the inherited list (otherwise the server inherits it).
const buildTechniqueOverrides = (form, template) => {
  // why: a template's deleted technique is not inherited as a live link, so it must not force an override
  const templateLive = withoutDeletedTechniques(sortTechniquesByOrder(template.advancedTechniques));
  if (haveSameTechniqueIds(withoutDeletedTechniques(form.advancedTechniques), templateLive)) return {};
  return { advancedTechniqueIds: toTechniqueIds(form.advancedTechniques), advancedTechniques: toTechniqueRefs(withoutDeletedTechniques(form.advancedTechniques)) };
};

// Sets, rest, load and notes part of the from-template overrides.
const buildSecondaryOverrides = (form) => ({
  ...(hasValue(form.sets) && { sets: parseInt(form.sets, 10) }),
  ...(hasValue(form.restInterval) && { restInterval: parseInt(form.restInterval, 10) }),
  ...(form.hasLoad && hasValue(form.suggestedLoad) && { suggestedLoad: parseFloat(form.suggestedLoad) }),
  ...(form.notes?.trim() && { notes: form.notes.trim() }),
});

// User-facing message for a failed save; unexpected (non-API) errors are also logged.
const describeSaveError = (error) => {
  if (!error?.userMessage && !error?.response) console.error(error);
  return error?.userMessage || translateError(error);
};

// True when the exercise form differs from its pristine state.
const isFormChanged = (form, initialForm) =>
  Object.keys(initialForm).some((field) => !isSameFieldValue(form[field], initialForm[field]));

// Field equality; technique lists compare by id and order.
const isSameFieldValue = (a, b) => (Array.isArray(a) && Array.isArray(b) ? haveSameTechniqueIds(a, b) : a === b);

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
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          className="input input--search"
          type="text"
          placeholder="Buscar exercício na biblioteca…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar exercício na biblioteca"
        />
        {showSpinner && (
          <Loader size={16} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
        )}
      </div>

      {showSpinner && displayList.length === 0 ? (
        <div className="library-empty type-body">Buscando…</div>
      ) : displayList.length === 0 ? (
        <div className="library-empty type-body">{emptyMessage}</div>
      ) : (
        <div className="library-panel__list" role="list">
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
                  <span className="library-item-name type-body-strong">{tmpl.name}</span>
                  {typeLabel && (
                    <span className="library-item-meta type-caption">
                      <span className="library-item-cat">{typeLabel}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="library-selection-bar type-caption">
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
  onSubmitFromTemplate,
  onCancel,
  onRequestDelete,
  footerTarget,
  onDirtyChange,
  substituteFor,
}) => {
  const isEditMode = snapshot != null;
  const baseForm = substituteFor ? substitutePrefill(substituteFor) : EMPTY_FORM;
  const isInDrawer = footerTarget !== undefined;

  const [tab, setTab] = useState('single');
  const [batchMode, setBatchMode] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [form, setForm] = useState(() =>
    isEditMode ? snapshotToForm(snapshot) : { ...baseForm }
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
  const [uploading, setUploading] = useState(false);

  const initialForm = isEditMode ? snapshotToForm(snapshot) : baseForm;
  const isDirty = isFormChanged(form, initialForm) || selectedTemplateIds.length > 0 || pickedTemplate !== null;

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

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

  const handleVideoFileChange = (key, previewUrl) => {
    setForm((prev) => ({ ...prev, videoFileKey: key, videoFilePreviewUrl: previewUrl }));
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

  const handleTechniquesChange = (advancedTechniques) => {
    setForm((prev) => ({ ...prev, advancedTechniques }));
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
    const gifError = getGifUrlError(form.gifUrl);
    if (gifError) errs.gifUrl = gifError;
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

  const submitGuarded = async (submit) => {
    setSubmitError(null);
    try {
      await submit();
    } catch (error) {
      setSubmitError(describeSaveError(error));
    }
  };

  const doSaveCreate = () => {
    setConfirmDialog(null);
    setErrors({});
    submitGuarded(() => onSubmitCreate(buildPayload(form, { isEdit: false })));
  };

  const doSaveEdit = () => {
    setConfirmDialog(null);
    setErrors({});
    submitGuarded(() => onSubmitEdit(snapshot.id, buildPayload(form, { isEdit: true })));
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
    submitGuarded(() => onSubmitCreate(buildPayload(form, { isEdit: false })));
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
    submitGuarded(() => onSubmitEdit(snapshot.id, buildPayload(form, { isEdit: true })));
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setBatchMode(false);
    setPickedTemplate(null);
    setForm({ ...baseForm });
    setSubmitError(null);
    setErrors({});
  };

  const handlePickTemplate = (template) => {
    setPickedTemplate(template);
    setSubmitError(null);
    setForm((prev) => ({
      ...prev,
      ...(!loadManuallySet && { hasLoad: getLoadDefault(template.type) }),
      ...templatePrescriptionPatch(template, prev),
    }));
  };

  const handleChangeTemplate = () => {
    setPickedTemplate(null);
    setSubmitError(null);
    // why: only template-inherited media is cleared; a URL the trainer typed themselves stays
    setForm((prev) => ({
      ...prev,
      intensity: null,
      advancedTechniques: [],
      videoUrl: prev.videoUrl === (pickedTemplate?.videoUrl ?? '') ? '' : prev.videoUrl,
      gifUrl: prev.gifUrl === (pickedTemplate?.gifUrl ?? '') ? '' : prev.gifUrl,
      ...(prev.videoFileKey === (pickedTemplate?.videoFileKey ?? null) && { videoFileKey: null, videoFilePreviewUrl: null }),
    }));
  };

  const saveFromTemplate = async () => {
    setSubmitError(null);
    try {
      await onSubmitFromTemplate(pickedTemplate.id, buildTemplateOverrides(form, pickedTemplate));
    } catch (error) {
      setSubmitError(describeSaveError(error));
    }
  };

  const handleSubmitFromTemplate = () => {
    if (hasPartialReps(form)) {
      setErrors({ reps: 'Informe as repetições mínimas e máximas.' });
      return;
    }
    const gifError = getGifUrlError(form.gifUrl);
    if (gifError) {
      setErrors({ gifUrl: gifError });
      return;
    }
    setErrors({});
    if (Object.keys(buildVolumeOverrides(form)).length > 0) {
      saveFromTemplate();
      return;
    }
    const warnKey = form.prescriptionMode === 'duration' ? 'duration' : 'reps';
    setConfirmDialog({
      message: t(`exercise.prescriptionWarn.${warnKey}`),
      onConfirm: () => {
        setConfirmDialog(null);
        saveFromTemplate();
      },
    });
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

  const saveLabel = substituteFor ? 'Salvar substituto' : 'Salvar exercício';

  let importLabel = `Importar ${selectedTemplateIds.length}`;
  if (saving) importLabel = 'Adicionando…';
  else if (selectedTemplateIds.length === 0) importLabel = 'Importar';

  const renderActions = (buttons) => {
    if (footerTarget === undefined) return <div className="composer-actions">{buttons}</div>;
    if (footerTarget === null) return null;
    return createPortal(buttons, footerTarget);
  };

  // ── Create/edit form ──────────────────────────────────────────────────────

  const renderCreateForm = (onSubmit, submitLabel) => (
    <form id={COMPOSER_FORM_ID} className="composer-sections" onSubmit={onSubmit} noValidate>

      {/* ── Band 1: O ESSENCIAL ── */}
      <div className="composer-band">
        <span className="composer-band-label type-h4">O essencial</span>

        <div className="composer-name-type-row">
          <div>
            <label className="field-label type-caption-strong" htmlFor="composer-name">
              Nome <span aria-hidden="true">*</span>
            </label>
            <input
              id="composer-name"
              className="input"
              type="text"
              value={form.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Ex: Remada unilateral"
              required
              autoFocus={!isEditMode}
            />
            {errors.name && (
              <span className="field-error type-caption" role="alert">{errors.name}</span>
            )}
          </div>
          <div>
            <label className="field-label type-caption-strong" htmlFor="composer-type">
              Tipo <span aria-hidden="true">*</span>
            </label>
            <select
              id="composer-type"
              className="input"
              value={form.type}
              onChange={(e) => handleFieldChange('type', e.target.value)}
              required
            >
              {EXERCISE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.type && (
              <span className="field-error type-caption" role="alert">{errors.type}</span>
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

      <PrescriptionBand
        form={form}
        exerciseType={form.type}
        onFieldChange={handleFieldChange}
        onPrescriptionChange={handlePrescriptionChange}
        onLoadToggle={handleLoadToggle}
        onRestChip={handleRestChipClick}
      />

      <TechniquesBand value={form.advancedTechniques} onChange={handleTechniquesChange} />

      {/* ── Band 4: DETALHES ── */}
      <div className="composer-band">
        <span className="composer-band-label type-h4">Detalhes</span>

        {/* Vídeo — library picker + YouTube URL fallback */}
        <VideoField
          value={form.videoUrl}
          onChange={(url) => handleFieldChange('videoUrl', url)}
          gifValue={form.gifUrl}
          onGifChange={(url) => handleFieldChange('gifUrl', url)}
          label="Vídeo de demonstração"
          gifError={errors.gifUrl}
          videoFileKey={form.videoFileKey}
          videoFilePreviewUrl={form.videoFilePreviewUrl}
          onVideoFileChange={handleVideoFileChange}
          onUploadingChange={setUploading}
        />

        {/* Observações — uncapped */}
        <div>
          <label className="field-label type-caption-strong" htmlFor="composer-notes">Observações</label>
          <textarea
            id="composer-notes"
            className="input"
            value={form.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder="Dica de execução, postura, foco muscular…"
            rows={3}
            aria-label="Observações"
          />
        </div>
      </div>

      {renderActions(
        <>
          {submitError && <p className="composer-footer-error field-error type-body" role="alert">{submitError}</p>}
          {isEditMode && onRequestDelete && (
            <button
              type="button"
              className="btn btn--secondary composer-actions-delete"
              onClick={onRequestDelete}
              disabled={saving}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
              Excluir
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form={COMPOSER_FORM_ID} className="btn btn--primary" disabled={saving || uploading}>
            {saving ? 'Salvando…' : submitLabel}
          </button>
        </>
      )}
    </form>
  );

  const renderPrescriptionFields = () => (
    <>
      <PrescriptionBand
        form={form}
        exerciseType={pickedTemplate?.type}
        onFieldChange={handleFieldChange}
        onPrescriptionChange={handlePrescriptionChange}
        onLoadToggle={handleLoadToggle}
        onRestChip={handleRestChipClick}
        error={errors.reps}
      />
      {pickedTemplate && <TechniquesBand value={form.advancedTechniques} onChange={handleTechniquesChange} />}
      <div className="composer-band">
        <span className="composer-band-label type-h4">Detalhes</span>
        <VideoField
          value={form.videoUrl}
          onChange={(url) => handleFieldChange('videoUrl', url)}
          gifValue={form.gifUrl}
          onGifChange={(url) => handleFieldChange('gifUrl', url)}
          label="Vídeo de demonstração"
          gifError={errors.gifUrl}
          videoFileKey={form.videoFileKey}
          videoFilePreviewUrl={form.videoFilePreviewUrl}
          onVideoFileChange={handleVideoFileChange}
          onUploadingChange={setUploading}
        />
      </div>
      <div className="composer-band">
        <NotesField value={form.notes} onChange={(value) => handleFieldChange('notes', value)} />
      </div>
    </>
  );

  const renderSingleActions = (submitLabel) => renderActions(
    <>
      {submitError && <p className="composer-footer-error field-error type-body" role="alert">{submitError}</p>}
      <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmitFromTemplate}
        disabled={saving || uploading || !pickedTemplate}
      >
        {saving ? 'Salvando…' : submitLabel}
      </button>
    </>
  );

  const renderSingleAdd = () => (
    <div className="composer-sections">
      <div className="composer-band">
        {pickedTemplate
          ? <PickedExercise template={pickedTemplate} onChange={handleChangeTemplate} />
          : <TemplateSearchCombobox templates={exerciseTemplates} onPick={handlePickTemplate} />}
        <IntensityField
          idPrefix="composer"
          type={pickedTemplate?.type ?? ''}
          intensity={form.intensity}
          options={EXERCISE_INTENSITY_OPTIONS}
          onChange={handleIntensityChange}
          onClear={handleIntensityClear}
          onKeepCardio={handleKeepCardio}
        />
      </div>
      {renderPrescriptionFields()}
      {renderSingleActions(saveLabel)}
    </div>
  );

  const renderBatchAdd = () => (
    <>
      <div>
        <button type="button" className="btn btn--ghost" onClick={() => setBatchMode(false)}>Voltar</button>
      </div>
      <LibraryPanel
        initialTemplates={exerciseTemplates}
        selectedIds={selectedTemplateIds}
        onToggle={handleToggleTemplate}
      />
      {renderActions(
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleImport}
            disabled={saving || selectedTemplateIds.length === 0}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            {importLabel}
          </button>
        </>
      )}
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="exercise-composer">
      {!isInDrawer && (
        <div className="inline-composer-title type-h4">
          {isEditMode || tab === 'create'
            ? <Plus size={16} strokeWidth={2} aria-hidden="true" />
            : <Library size={16} strokeWidth={2} aria-hidden="true" />
          }
          {isEditMode ? 'Editar exercício' : 'Adicionar exercício'}
        </div>
      )}

      {!isEditMode && (
        <div className="exercise-composer__tabs-row">
          <Segmented
            ariaLabel="Modo de adição"
            items={[
              { id: 'single', label: 'Adicionar exercício' },
              { id: 'create', label: 'Criar novo' },
            ]}
            value={tab}
            onChange={handleTabChange}
          />
          {tab === 'single' && !batchMode && !substituteFor && (
            <button type="button" className="btn btn--ghost" onClick={() => setBatchMode(true)}>
              Adicionar em lote
            </button>
          )}
        </div>
      )}

      {isEditMode && renderCreateForm(handleSubmitEdit, 'Salvar alterações')}

      {!isEditMode && tab === 'create' && renderCreateForm(handleSubmitCreate, saveLabel)}

      {!isEditMode && tab === 'single' && !batchMode && renderSingleAdd()}

      {!isEditMode && tab === 'single' && batchMode && renderBatchAdd()}

      {confirmDialog && createPortal(
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={t('exercise.prescriptionWarn.confirm')}
          cancelLabel={t('exercise.prescriptionWarn.cancel')}
          confirmTone="primary"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />,
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
  /** Single library add: (templateId, overrides) with the edited prescription. */
  onSubmitFromTemplate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onRequestDelete: PropTypes.func,
  /** Drawer footer node to portal the action buttons into (null while mounting). Omit for inline actions. */
  footerTarget: PropTypes.instanceOf(Element),
  /** Called with true/false whenever unsaved edits appear or disappear. */
  onDirtyChange: PropTypes.func,
  /** Principal exercise when composing a substitute: prefills the create form from it. */
  substituteFor: PropTypes.object,
};

ExerciseComposer.defaultProps = {
  snapshot: null,
  onRequestDelete: null,
  footerTarget: undefined,
  onDirtyChange: null,
  substituteFor: null,
};

export default ExerciseComposer;
