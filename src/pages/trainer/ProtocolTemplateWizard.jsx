import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
  X,
  GripVertical,
  MoreVertical,
  Plus,
  Dumbbell,
  BookOpen,
} from 'lucide-react';
import RoutineSummaryBar from '../../components/RoutineSummaryBar';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import { WEEK_DAY_OPTIONS, getWeekDayLabel } from '../../constants/weekDays';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { EXERCISE_TYPE_OPTIONS } from '../../constants/exerciseTypes';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

// ─── Draft helpers ─────────────────────────────────────────────────────────

const DRAFT_KEY = 'treinoway:protocol-template-draft';
const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== DRAFT_VERSION) return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (data) => {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ data, savedAt: new Date().toISOString(), version: DRAFT_VERSION })
    );
  } catch {
    // silently fail
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // silently fail
  }
};

const formatRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (days > 0) return `há ${days} dia${days > 1 ? 's' : ''}`;
  if (hours > 0) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  return 'agora';
};

// ─── Constants ─────────────────────────────────────────────────────────────

const TRAINING_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'athlete', label: 'Atleta' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
];

const BODY_SEGMENT_OPTIONS = [
  { value: 'upper', label: 'Superior' },
  { value: 'lower', label: 'Inferior' },
  { value: 'full_body', label: 'Corpo Inteiro' },
];

const getLevelLabel = (val) => TRAINING_LEVEL_OPTIONS.find((o) => o.value === val)?.label || '';
const getGenderLabel = (val) => GENDER_OPTIONS.find((o) => o.value === val)?.label || '';
const getSegmentLabel = (val) => BODY_SEGMENT_OPTIONS.find((o) => o.value === val)?.label || '';

const isValidUuid = (val) =>
  typeof val === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const buildPayload = (step1, trainings) => ({
  name: step1.name,
  description: step1.description || undefined,
  type: step1.type || undefined,
  trainingLevel: step1.trainingLevel || undefined,
  genderOrdination: step1.genderOrdination || undefined,
  defaultDurationWeeks: parseInt(step1.defaultDurationWeeks, 10) || 12,
  trainings: trainings
    .filter(({ trainingTemplateId }) => isValidUuid(trainingTemplateId))
    .map(({ trainingTemplateId, weekDay, order }) => ({
      trainingTemplateId,
      order: order || 0,
      ...(weekDay && { weekDay: weekDay.toLowerCase() }),
    })),
});

const normalizeExerciseIds = (ids) =>
  (ids || []).map((id) =>
    typeof id === 'number' ? id : Number.isNaN(Number(id)) ? id : Number(id)
  );

// ─── WizardStepper ─────────────────────────────────────────────────────────

const WizardStepper = ({ currentStep }) => (
  <div className="wizard-stepper">
    <div className={`wizard-step-dot${currentStep >= 1 ? ' wizard-step-dot--active' : ''}${currentStep > 1 ? ' wizard-step-dot--done' : ''}`}>
      1
    </div>
    <div className={`wizard-step-line${currentStep > 1 ? ' wizard-step-line--done' : ''}`} />
    <div className={`wizard-step-dot${currentStep >= 2 ? ' wizard-step-dot--active' : ''}`}>
      2
    </div>
    <span className={`wizard-step-label${currentStep === 1 ? ' wizard-step-label--active' : ''}`}>
      Identidade
    </span>
    <span className={`wizard-step-label wizard-step-label--right${currentStep === 2 ? ' wizard-step-label--active' : ''}`}>
      Treinos
    </span>
  </div>
);

WizardStepper.propTypes = {
  currentStep: PropTypes.number.isRequired,
};

// ─── WizardBreadcrumb ──────────────────────────────────────────────────────

const WizardBreadcrumb = ({ crumbs }) => (
  <div className="wizard-breadcrumb">
    {crumbs.map((crumb, index) => (
      <span key={index}>
        {index > 0 && <span className="wizard-breadcrumb-sep" aria-hidden="true">›</span>}
        <span className={index === crumbs.length - 1 ? 'wizard-breadcrumb-current' : 'wizard-breadcrumb-ancestor'}>
          {crumb.label.length > 24 ? `${crumb.label.slice(0, 22)}…` : crumb.label}
        </span>
      </span>
    ))}
  </div>
);

WizardBreadcrumb.propTypes = {
  crumbs: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired })).isRequired,
};

// ─── DraftRecoveryBanner ───────────────────────────────────────────────────

const DraftRecoveryBanner = ({ draft, onContinue, onDiscard }) => {
  const name = draft.data?.step1?.name || 'Sem título';
  const trainingsCount = draft.data?.trainings?.length || 0;
  const exercisesCount = (draft.data?.trainings || []).reduce(
    (sum, t) => sum + (t.exerciseTemplateIds?.length || 0),
    0
  );
  const relTime = formatRelativeTime(draft.savedAt);

  return (
    <div className="wizard-draft-banner">
      <div className="wizard-draft-banner-body">
        <BookOpen size={16} />
        <div>
          <strong>Rascunho: &ldquo;{name}&rdquo;</strong>
          <span className="wizard-draft-banner-meta">
            {relTime} · {trainingsCount} treino{trainingsCount !== 1 ? 's' : ''}, {exercisesCount} exercício{exercisesCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="wizard-draft-banner-actions">
        <button type="button" className="btn-primary btn-sm" onClick={onContinue}>
          Continuar
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onDiscard}>
          Descartar
        </button>
      </div>
    </div>
  );
};

DraftRecoveryBanner.propTypes = {
  draft: PropTypes.object.isRequired,
  onContinue: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
};

// ─── OriginToggle ──────────────────────────────────────────────────────────

const OriginToggle = ({ value, onChange, hasTemplates, label }) => {
  if (!hasTemplates) return null;
  return (
    <div className="wizard-origin-toggle-wrapper">
      <div className="segmented-toggle">
        <button
          type="button"
          className={`segmented-toggle-btn${value === 'new' ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => onChange('new')}
        >
          Criar novo
        </button>
        <button
          type="button"
          className={`segmented-toggle-btn${value === 'existing' ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => onChange('existing')}
        >
          Usar existente
        </button>
      </div>
      <p className="wizard-origin-helper">{label || 'Escolha de onde vem este item.'}</p>
    </div>
  );
};

OriginToggle.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  hasTemplates: PropTypes.bool.isRequired,
  label: PropTypes.string,
};

// ─── LibraryNote ──────────────────────────────────────────────────────────

const LibraryNote = ({ text }) => (
  <div className="wizard-library-note">
    <BookOpen size={14} />
    <span>{text}</span>
  </div>
);

LibraryNote.propTypes = {
  text: PropTypes.string.isRequired,
};

// ─── TrainingRowMenu ──────────────────────────────────────────────────────

const TrainingRowMenu = ({ training, index, total, onMoveUp, onMoveDown, onSwap, onChangeDay, onRemove }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={`Ações do treino ${training.name || 'sem nome'}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="row-menu-dropdown" role="menu">
          {index > 0 && (
            <button type="button" className="row-menu-item" role="menuitem" onClick={() => { setOpen(false); onMoveUp(); }}>
              ↑ Mover para cima
            </button>
          )}
          {index < total - 1 && (
            <button type="button" className="row-menu-item" role="menuitem" onClick={() => { setOpen(false); onMoveDown(); }}>
              ↓ Mover para baixo
            </button>
          )}
          <button type="button" className="row-menu-item" role="menuitem" onClick={() => { setOpen(false); onSwap(); }}>
            Trocar template
          </button>
          <button type="button" className="row-menu-item" role="menuitem" onClick={() => { setOpen(false); onChangeDay(); }}>
            Alterar dia e ordem
          </button>
          <button type="button" className="row-menu-item row-menu-item--danger" role="menuitem" onClick={() => { setOpen(false); onRemove(); }}>
            Remover
          </button>
        </div>
      )}
    </div>
  );
};

TrainingRowMenu.propTypes = {
  training: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onSwap: PropTypes.func.isRequired,
  onChangeDay: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// ─── SortableTrainingRow ──────────────────────────────────────────────────

const SortableTrainingRow = ({ training, index, total, exerciseTemplates, onMoveUp, onMoveDown, onSwap, onChangeDay, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: training._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const dayLabel = getWeekDayLabel(training.weekDay);
  const templateName = training.name || '—';

  const previewExercises = (training.exerciseTemplateIds || [])
    .map((id) => exerciseTemplates.find((et) => String(et.id) === String(id)))
    .filter(Boolean);

  const visibleExercises = previewExercises.slice(0, 3);
  const hiddenCount = previewExercises.length - visibleExercises.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`schedule-template-row${isDragging ? ' schedule-template-row--dragging' : ''}`}
    >
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Arrastar para reordenar">
        <GripVertical size={16} strokeWidth={1.8} />
      </span>
      <div className="schedule-template-fields">
        <div className="wizard-training-row-header">
          <span className="schedule-row-name">{templateName}</span>
          {training.savedPill && <span className="wizard-saved-pill">Salvo</span>}
        </div>
        <span className="schedule-row-meta">
          {[dayLabel, training.order ? `Ordem ${training.order}` : null].filter(Boolean).join(' · ')}
        </span>
        {visibleExercises.length > 0 && (
          <div className="wizard-exercise-preview">
            {visibleExercises.map((ex, i) => (
              <span key={ex.id}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                {ex.name}
                {formatExerciseMeta(ex) ? ` (${formatExerciseMeta(ex)})` : ''}
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="wizard-exercise-preview-more"> +{hiddenCount} mais</span>
            )}
          </div>
        )}
      </div>
      <TrainingRowMenu
        training={training}
        index={index}
        total={total}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onSwap={onSwap}
        onChangeDay={onChangeDay}
        onRemove={onRemove}
      />
    </div>
  );
};

SortableTrainingRow.propTypes = {
  training: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onSwap: PropTypes.func.isRequired,
  onChangeDay: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// ─── Step 1: Identity ─────────────────────────────────────────────────────

const Step1Identity = ({ data, onChange, onNext }) => {
  const [errors, setErrors] = useState({});
  const canAdvance = data.name.trim() && data.trainingLevel && data.type;

  const validate = () => {
    const e = {};
    if (!data.name.trim()) e.name = 'Nome é obrigatório.';
    if (!data.trainingLevel) e.trainingLevel = 'Nível é obrigatório.';
    if (!data.type) e.type = 'Tipo é obrigatório.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="wizard-step-content">
      <div className="form">
        <div className="form-group">
          <label className="form-label" htmlFor="wiz-name">
            Nome <span aria-hidden="true" className="form-required">*</span>
          </label>
          <input
            id="wiz-name"
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className={`form-input${errors.name ? ' form-input--error' : ''}`}
            placeholder="Ex: Hipertrofia 12 semanas — Masculino Intermediário"
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="wiz-description">Descrição</label>
          <textarea
            id="wiz-description"
            value={data.description}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            rows={3}
            className="form-textarea"
            placeholder="Descreva o objetivo desta rotina..."
          />
        </div>

        <div className="grid-responsive-2col">
          <div className="form-group">
            <label className="form-label" htmlFor="wiz-type">
              Tipo <span aria-hidden="true" className="form-required">*</span>
            </label>
            <Select
              id="wiz-type"
              value={data.type}
              onChange={(e) => onChange({ ...data, type: e.target.value })}
              className={errors.type ? 'form-input--error' : ''}
              required
            >
              <option value="">Selecione...</option>
              {PROTOCOL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            {errors.type && <span className="form-error">{errors.type}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wiz-level">
              Nível <span aria-hidden="true" className="form-required">*</span>
            </label>
            <Select
              id="wiz-level"
              value={data.trainingLevel}
              onChange={(e) => onChange({ ...data, trainingLevel: e.target.value })}
              className={errors.trainingLevel ? 'form-input--error' : ''}
              required
            >
              <option value="">Selecione...</option>
              {TRAINING_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            {errors.trainingLevel && <span className="form-error">{errors.trainingLevel}</span>}
          </div>
        </div>

        <div className="grid-responsive-2col">
          <div className="form-group">
            <label className="form-label" htmlFor="wiz-gender">Sexo biológico</label>
            <Select
              id="wiz-gender"
              value={data.genderOrdination}
              onChange={(e) => onChange({ ...data, genderOrdination: e.target.value })}
            >
              <option value="">— Qualquer —</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="wiz-duration">Duração (semanas)</label>
            <input
              id="wiz-duration"
              type="number"
              min="1"
              value={data.defaultDurationWeeks}
              onChange={(e) => onChange({ ...data, defaultDurationWeeks: parseInt(e.target.value, 10) || 1 })}
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="wizard-footer">
        <button
          type="button"
          className="btn-primary"
          onClick={handleNext}
          disabled={!canAdvance}
        >
          Avançar →
        </button>
        {!canAdvance && (
          <span className="wizard-footer-helper">Preencha os campos obrigatórios para avançar.</span>
        )}
      </div>
    </div>
  );
};

Step1Identity.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

// ─── ExercisePickerRow ─────────────────────────────────────────────────────

const ExercisePickerRow = ({ exerciseId, exerciseTemplates, onRemove }) => {
  const ex = exerciseTemplates.find((et) => String(et.id) === String(exerciseId));
  if (!ex) return null;
  const meta = formatExerciseMeta(ex);
  return (
    <div className="wizard-exercise-row">
      <div className="wizard-exercise-row-info">
        <span className="wizard-exercise-row-title">{ex.name}</span>
        {meta && <span className="wizard-exercise-row-meta">{meta}</span>}
      </div>
      <button
        type="button"
        className="wizard-exercise-row-remove"
        onClick={() => onRemove(exerciseId)}
        aria-label={`Remover exercício ${ex.name}`}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
};

ExercisePickerRow.propTypes = {
  exerciseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// ─── DrillExercise ────────────────────────────────────────────────────────

const DrillExercise = ({ exerciseTemplates, onSaved, onBack }) => {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState('new');
  const hasTemplates = exerciseTemplates.length > 0;
  const effectiveOrigin = hasTemplates ? origin : 'new';
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    videoUrl: '',
    sets: '',
    repetitionsMin: '',
    repetitionsMax: '',
    duration: '',
    restInterval: '',
    hasLoad: false,
    suggestedLoad: '',
    notes: '',
    isPublic: false,
  });

  const showRepetitions = formData.type !== 'cardio';

  const handleSaveExisting = () => {
    if (!existingId) return;
    const ex = exerciseTemplates.find((e) => String(e.id) === String(existingId));
    onSaved(ex);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      showToast('Nome do exercício é obrigatório.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type || undefined,
        isPublic: formData.isPublic,
        hasLoad: formData.hasLoad,
      };
      if (formData.videoUrl?.trim()) payload.videoUrl = formData.videoUrl.trim();
      if (formData.sets !== '') payload.sets = parseInt(formData.sets, 10);
      if (formData.repetitionsMin !== '' && formData.repetitionsMax !== '') {
        payload.repetitions = { min: parseInt(formData.repetitionsMin, 10), max: parseInt(formData.repetitionsMax, 10) };
      }
      if (formData.duration !== '') payload.duration = parseInt(formData.duration, 10);
      if (formData.restInterval !== '') payload.restInterval = parseInt(formData.restInterval, 10);
      if (formData.hasLoad && formData.suggestedLoad !== '') payload.suggestedLoad = parseFloat(formData.suggestedLoad);
      if (formData.notes?.trim()) payload.notes = formData.notes.trim();

      const response = await api.post('/trainer/exercise-templates', payload);
      showToast('Template salvo na sua biblioteca.', 'success');
      onSaved(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wizard-step-content">
      <h1 className="wizard-drill-title">Novo exercício</h1>
      <OriginToggle
        value={origin}
        onChange={setOrigin}
        hasTemplates={hasTemplates}
        label="Escolha de onde vem este exercício."
      />

      {effectiveOrigin === 'existing' && (
        <div className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="drill-ex-existing">Exercício existente</label>
            <Select
              id="drill-ex-existing"
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
            >
              <option value="">Selecione um exercício...</option>
              {exerciseTemplates.map((et) => (
                <option key={et.id} value={et.id}>{et.name}</option>
              ))}
            </Select>
            {existingId && (() => {
              const ex = exerciseTemplates.find((e) => String(e.id) === String(existingId));
              const meta = ex ? formatExerciseMeta(ex) : null;
              return meta ? <p className="wizard-preview-meta">{meta}</p> : null;
            })()}
          </div>
          <div className="wizard-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveExisting}
              disabled={!existingId}
            >
              Adicionar exercício
            </button>
          </div>
        </div>
      )}

      {effectiveOrigin === 'new' && (
        <div className="form">
          <LibraryNote text="O exercício será salvo na sua biblioteca de templates e poderá ser reutilizado em outros treinos." />

          <div className="form-group">
            <label className="form-label" htmlFor="drill-ex-name">
              Nome <span aria-hidden="true" className="form-required">*</span>
            </label>
            <input
              id="drill-ex-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              placeholder="Ex.: Supino reto"
              autoFocus
            />
          </div>

          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="drill-ex-type">Tipo</label>
              <Select
                id="drill-ex-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="">Selecione...</option>
                {EXERCISE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="drill-ex-videoUrl">Vídeo (URL)</label>
              <input
                id="drill-ex-videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="form-input"
                placeholder="https://..."
              />
            </div>
          </div>

          <h3 className="wizard-ex-section-title">Séries e execução</h3>

          {showRepetitions ? (
            <div className="wizard-ex-sets-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="drill-ex-sets">Séries</label>
                <input
                  id="drill-ex-sets"
                  type="number"
                  min="1"
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reps (mín–máx)</label>
                <div className="grid-2col" style={{ gap: 'var(--spacing-xs)' }}>
                  <input
                    type="number"
                    min="1"
                    value={formData.repetitionsMin}
                    onChange={(e) => setFormData({ ...formData, repetitionsMin: e.target.value })}
                    className="form-input"
                    aria-label="Repetições mínimas"
                    placeholder="Mín"
                  />
                  <input
                    type="number"
                    min="1"
                    value={formData.repetitionsMax}
                    onChange={(e) => setFormData({ ...formData, repetitionsMax: e.target.value })}
                    className="form-input"
                    aria-label="Repetições máximas"
                    placeholder="Máx"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="drill-ex-rest">Descanso (s)</label>
                <input
                  id="drill-ex-rest"
                  type="number"
                  min="0"
                  value={formData.restInterval}
                  onChange={(e) => setFormData({ ...formData, restInterval: e.target.value })}
                  className="form-input"
                  placeholder="Ex: 60"
                />
              </div>
            </div>
          ) : (
            <div className="grid-responsive-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="drill-ex-sets2">Séries</label>
                <input
                  id="drill-ex-sets2"
                  type="number"
                  min="1"
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="drill-ex-duration">Duração (segundos)</label>
                <input
                  id="drill-ex-duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="form-input"
                  placeholder="Ex: 60"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="drill-ex-rest2">Descanso (s)</label>
                <input
                  id="drill-ex-rest2"
                  type="number"
                  min="0"
                  value={formData.restInterval}
                  onChange={(e) => setFormData({ ...formData, restInterval: e.target.value })}
                  className="form-input"
                  placeholder="Ex: 60"
                />
              </div>
            </div>
          )}

          <div className="form-checkbox-row" style={{ marginBottom: 'var(--spacing-md)' }}>
            <input
              type="checkbox"
              id="drill-ex-hasLoad"
              checked={formData.hasLoad}
              onChange={(e) => setFormData({ ...formData, hasLoad: e.target.checked })}
            />
            <label htmlFor="drill-ex-hasLoad" className="form-label mb-0">Tem carga</label>
          </div>

          {formData.hasLoad && (
            <div className="form-group" style={{ maxWidth: '240px' }}>
              <label className="form-label" htmlFor="drill-ex-load">Carga sugerida</label>
              <input
                id="drill-ex-load"
                type="number"
                min="0"
                step="0.5"
                value={formData.suggestedLoad}
                onChange={(e) => setFormData({ ...formData, suggestedLoad: e.target.value })}
                className="form-input"
                placeholder="Ex: 40"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="drill-ex-notes">Observações</label>
            <textarea
              id="drill-ex-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="form-textarea"
              placeholder="Dicas de execução, cadência, etc."
            />
          </div>

          <div className="wizard-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveNew}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar exercício'}
            </button>
          </div>
        </div>
      )}

      {!effectiveOrigin && (
        <div className="wizard-origin-placeholder">
          <p className="text-muted">Selecione de onde vem este exercício para continuar.</p>
        </div>
      )}

      <div className="wizard-back-link">
        <button type="button" className="btn-secondary btn-secondary-sm" onClick={onBack}>
          ← Voltar ao treino
        </button>
      </div>
    </div>
  );
};

DrillExercise.propTypes = {
  exerciseTemplates: PropTypes.array.isRequired,
  onSaved: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

// ─── DrillTraining ────────────────────────────────────────────────────────

const nextFreeOrder = (weekDay, existingTrainings, excludeId) => {
  const relevant = existingTrainings.filter(
    (t) => (t.weekDay || '') === (weekDay || '') && t._id !== excludeId
  );
  if (relevant.length === 0) return 1;
  return Math.max(...relevant.map((t) => t.order || 0)) + 1;
};

const buildWeekDayOptions = (existingTrainings, excludeId) =>
  WEEK_DAY_OPTIONS.map((opt) => {
    const count = existingTrainings.filter(
      (t) => (t.weekDay || '') === opt.value && t._id !== excludeId
    ).length;
    return {
      value: opt.value,
      label: count > 0 ? `${opt.label} · ${count} treino${count !== 1 ? 's' : ''}` : opt.label,
    };
  });

const DrillTraining = ({ trainingTemplates, exerciseTemplates, onSaved, onBack, swapTraining, onExerciseCreated, existingTrainings, onDrillChange, onRegisterCloseExerciseDrill }) => {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState('new');
  const hasTemplates = trainingTemplates.length > 0;
  const effectiveOrigin = hasTemplates ? origin : 'new';
  const [saving, setSaving] = useState(false);
  const [showExerciseDrill, setShowExerciseDrill] = useState(false);
  const [localExerciseTemplates, setLocalExerciseTemplates] = useState(exerciseTemplates);

  const excludeId = swapTraining?._id;
  const initialOrder = nextFreeOrder('', existingTrainings, excludeId);

  const [orderTouched, setOrderTouched] = useState(false);
  const [existingData, setExistingData] = useState({
    trainingTemplateId: '',
    weekDay: '',
    order: initialOrder,
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
    exerciseTemplateIds: [],
    weekDay: '',
    order: swapTraining?.order || initialOrder,
  });

  const weekDayOptions = buildWeekDayOptions(existingTrainings, excludeId);

  useEffect(() => {
    setLocalExerciseTemplates(exerciseTemplates);
  }, [exerciseTemplates]);

  useEffect(() => {
    if (!onDrillChange) return;
    const trainingLabel = effectiveOrigin === 'existing' ? 'Importar treino' : 'Novo treino';
    onDrillChange([trainingLabel]);
  }, [effectiveOrigin, onDrillChange]);

  useEffect(() => {
    if (showExerciseDrill) {
      onRegisterCloseExerciseDrill?.(() => {
        setShowExerciseDrill(false);
        if (onDrillChange) {
          const trainingLabel = effectiveOrigin === 'existing' ? 'Importar treino' : 'Novo treino';
          onDrillChange([trainingLabel]);
        }
      });
    } else {
      onRegisterCloseExerciseDrill?.(null);
    }
  }, [showExerciseDrill, onRegisterCloseExerciseDrill, onDrillChange, effectiveOrigin]);

  const handleExercisePickerRemove = (id) => {
    setFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: prev.exerciseTemplateIds.filter((eid) => eid !== id),
    }));
  };

  const handleExerciseSaved = (newExercise) => {
    if (newExercise?.id) {
      setLocalExerciseTemplates((prev) => {
        const exists = prev.some((e) => String(e.id) === String(newExercise.id));
        return exists ? prev : [...prev, newExercise];
      });
      setFormData((prev) => {
        const alreadyAdded = prev.exerciseTemplateIds.some(
          (eid) => String(eid) === String(newExercise.id)
        );
        if (alreadyAdded) return prev;
        return { ...prev, exerciseTemplateIds: [...prev.exerciseTemplateIds, newExercise.id] };
      });
      onExerciseCreated?.(newExercise);
    }
    setShowExerciseDrill(false);
    if (onDrillChange) {
      const trainingLabel = effectiveOrigin === 'existing' ? 'Importar treino' : 'Novo treino';
      onDrillChange([trainingLabel]);
    }
  };

  const handleOriginChange = (newOrigin) => {
    setOrigin(newOrigin);
    setOrderTouched(false);
    const suggested = nextFreeOrder('', existingTrainings, excludeId);
    setExistingData((prev) => ({ ...prev, weekDay: '', order: suggested }));
    setFormData((prev) => ({ ...prev, weekDay: '', order: suggested }));
  };

  const handleExistingWeekDayChange = (newDay) => {
    const suggested = nextFreeOrder(newDay, existingTrainings, excludeId);
    setExistingData((prev) => ({
      ...prev,
      weekDay: newDay,
      order: orderTouched ? prev.order : suggested,
    }));
  };

  const handleNewWeekDayChange = (newDay) => {
    const suggested = nextFreeOrder(newDay, existingTrainings, excludeId);
    setFormData((prev) => ({
      ...prev,
      weekDay: newDay,
      order: orderTouched ? prev.order : suggested,
    }));
  };

  const handleSaveExisting = () => {
    if (!existingData.trainingTemplateId) {
      showToast('Selecione um treino.', 'error');
      return;
    }
    const template = trainingTemplates.find(
      (t) => String(t.id) === String(existingData.trainingTemplateId)
    );
    setOrderTouched(false);
    const trainingEntry = {
      _id: crypto.randomUUID(),
      trainingTemplateId: existingData.trainingTemplateId,
      name: template?.name || '—',
      weekDay: existingData.weekDay,
      order: existingData.order || 1,
      exerciseTemplateIds: [],
      savedPill: false,
    };
    onSaved(trainingEntry);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      showToast('Nome do treino é obrigatório.', 'error');
      return;
    }
    if (!formData.category) {
      showToast('Categoria é obrigatória.', 'error');
      return;
    }
    setSaving(true);
    try {
      const normalizedIds = normalizeExerciseIds(formData.exerciseTemplateIds);
      const payload = {
        name: formData.name.trim(),
        description: formData.description || undefined,
        category: formData.category,
        bodySegment: formData.bodySegment || undefined,
        isPublic: formData.isPublic,
        ...(normalizedIds.length > 0 && { exerciseTemplateIds: normalizedIds }),
      };

      const response = await api.post('/trainer/training-templates', payload);
      const created = response.data;
      showToast('Treino salvo na sua biblioteca.', 'success');

      setOrderTouched(false);
      const trainingEntry = {
        _id: crypto.randomUUID(),
        trainingTemplateId: created.id,
        name: created.name,
        weekDay: formData.weekDay,
        order: formData.order || 1,
        exerciseTemplateIds: normalizedIds,
        savedPill: true,
      };
      onSaved(trainingEntry);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (showExerciseDrill) {
    return (
      <DrillExercise
        exerciseTemplates={localExerciseTemplates}
        onSaved={handleExerciseSaved}
        onBack={() => {
          setShowExerciseDrill(false);
          if (onDrillChange) {
            const trainingLabel = effectiveOrigin === 'existing' ? 'Importar treino' : 'Novo treino';
            onDrillChange([trainingLabel]);
          }
        }}
      />
    );
  }

  return (
    <div className="wizard-step-content">
      <h1 className="wizard-drill-title">
        {swapTraining ? 'Trocar treino' : 'Adicionar treino'}
      </h1>
      <p className="wizard-drill-subtitle">
        {swapTraining
          ? 'Escolha um template para substituir este treino.'
          : 'Escolha um template existente ou crie um novo treino para esta rotina.'}
      </p>
      <OriginToggle
        value={origin}
        onChange={handleOriginChange}
        hasTemplates={hasTemplates}
        label="Escolha de onde vem este treino."
      />

      {existingTrainings.length > 0 && <RoutineSummaryBar trainings={existingTrainings} />}

      {effectiveOrigin === 'existing' && (
        <div className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="drill-tt-existing">Treino existente</label>
            <Select
              id="drill-tt-existing"
              value={existingData.trainingTemplateId}
              onChange={(e) => setExistingData({ ...existingData, trainingTemplateId: e.target.value })}
            >
              <option value="">Selecione um treino...</option>
              {trainingTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            {existingData.trainingTemplateId && (() => {
              const t = trainingTemplates.find((tt) => String(tt.id) === String(existingData.trainingTemplateId));
              const meta = [
                t?.category ? (TRAINING_CATEGORY_LABEL[t.category] || t.category) : null,
                t?.bodySegment ? getSegmentLabel(t.bodySegment) : null,
              ].filter(Boolean).join(' · ');
              return meta ? <p className="wizard-preview-meta">{meta}</p> : null;
            })()}
          </div>

          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-weekday">Dia da semana</label>
              <Select
                id="drill-tt-weekday"
                value={existingData.weekDay}
                onChange={(e) => handleExistingWeekDayChange(e.target.value)}
              >
                <option value="">— Sem dia —</option>
                {weekDayOptions.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-order">Ordem</label>
              <input
                id="drill-tt-order"
                type="number"
                min="1"
                value={existingData.order}
                onChange={(e) => {
                  setOrderTouched(true);
                  setExistingData({ ...existingData, order: parseInt(e.target.value, 10) || 1 });
                }}
                className="form-input"
              />
              {orderTouched && String(existingData.order) !== String(nextFreeOrder(existingData.weekDay, existingTrainings, excludeId)) && (
                <span className="form-hint">
                  Próximo livre neste dia: {nextFreeOrder(existingData.weekDay, existingTrainings, excludeId)}
                </span>
              )}
            </div>
          </div>

          <div className="wizard-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveExisting}
              disabled={!existingData.trainingTemplateId}
            >
              Adicionar treino
            </button>
          </div>
        </div>
      )}

      {effectiveOrigin === 'new' && (
        <div className="form">
          <LibraryNote text="O treino será salvo na sua biblioteca de templates e poderá ser reutilizado em outras rotinas." />

          <div className="form-group">
            <label className="form-label" htmlFor="drill-tt-name">
              Nome <span aria-hidden="true" className="form-required">*</span>
            </label>
            <input
              id="drill-tt-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="drill-tt-description">Descrição</label>
            <textarea
              id="drill-tt-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="form-textarea"
            />
          </div>

          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-category">
                Categoria <span aria-hidden="true" className="form-required">*</span>
              </label>
              <Select
                id="drill-tt-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {TRAINING_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-segment">Segmento corporal</label>
              <Select
                id="drill-tt-segment"
                value={formData.bodySegment}
                onChange={(e) => setFormData({ ...formData, bodySegment: e.target.value })}
              >
                <option value="">— Qualquer —</option>
                {BODY_SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-weekday2">Dia da semana</label>
              <Select
                id="drill-tt-weekday2"
                value={formData.weekDay}
                onChange={(e) => handleNewWeekDayChange(e.target.value)}
              >
                <option value="">— Sem dia —</option>
                {weekDayOptions.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </Select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="drill-tt-order2">Ordem</label>
              <input
                id="drill-tt-order2"
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => {
                  setOrderTouched(true);
                  setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 });
                }}
                className="form-input"
              />
              {orderTouched && String(formData.order) !== String(nextFreeOrder(formData.weekDay, existingTrainings, excludeId)) && (
                <span className="form-hint">
                  Próximo livre neste dia: {nextFreeOrder(formData.weekDay, existingTrainings, excludeId)}
                </span>
              )}
            </div>
          </div>

          <div className="form-checkbox-row">
            <input
              type="checkbox"
              id="drill-tt-isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
            />
            <label htmlFor="drill-tt-isPublic" className="form-label mb-0">Tornar este template público</label>
          </div>

          <div className="wizard-section">
            <div className="wizard-section-header">
              <h2 className="wizard-exercises-title">Exercícios</h2>
              <span className="wizard-section-count">
                {formData.exerciseTemplateIds.length} exercício{formData.exerciseTemplateIds.length !== 1 ? 's' : ''}
                {formData.exerciseTemplateIds.length > 0 && ' · arraste para reordenar'}
              </span>
            </div>

            {formData.exerciseTemplateIds.length === 0 ? (
              <div className="wizard-exercises-empty">
                Nenhum exercício ainda.
              </div>
            ) : (
              <div className="wizard-exercise-list">
                {formData.exerciseTemplateIds.map((id) => (
                  <ExercisePickerRow
                    key={id}
                    exerciseId={id}
                    exerciseTemplates={localExerciseTemplates}
                    onRemove={handleExercisePickerRemove}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn-add"
              style={{ marginTop: 'var(--spacing-sm)' }}
              onClick={() => {
                setShowExerciseDrill(true);
                if (onDrillChange) {
                  const trainingLabel = effectiveOrigin === 'existing' ? 'Importar treino' : 'Novo treino';
                  const trainingName = formData.name.trim() || trainingLabel;
                  onDrillChange([trainingName, 'Novo exercício']);
                }
              }}
            >
              <Plus size={16} /> Adicionar exercício
            </button>
          </div>

          <div className="wizard-footer">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveNew}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar treino'}
            </button>
          </div>
        </div>
      )}

      {!effectiveOrigin && (
        <div className="wizard-origin-placeholder">
          <p className="text-muted">Selecione de onde vem este treino para continuar.</p>
        </div>
      )}

      {onBack && (
        <div className="wizard-back-link">
          <button type="button" className="btn-secondary btn-secondary-sm" onClick={onBack}>
            ← Voltar à rotina
          </button>
        </div>
      )}
    </div>
  );
};

DrillTraining.propTypes = {
  trainingTemplates: PropTypes.array.isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  onSaved: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  swapTraining: PropTypes.object,
  onExerciseCreated: PropTypes.func,
  existingTrainings: PropTypes.array,
  onDrillChange: PropTypes.func,
  onRegisterCloseExerciseDrill: PropTypes.func,
};

// ─── ChangeDayModal ────────────────────────────────────────────────────────

const ChangeDayModal = ({ training, onSave, onClose }) => {
  const [weekDay, setWeekDay] = useState(training.weekDay || '');
  const [order, setOrder] = useState(training.order || 1);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-h3-size)' }}>
          Alterar dia e ordem
        </h3>
        <div className="form-group">
          <label className="form-label" htmlFor="modal-weekday">Dia da semana</label>
          <Select
            id="modal-weekday"
            value={weekDay}
            onChange={(e) => setWeekDay(e.target.value)}
          >
            <option value="">— Sem dia —</option>
            {WEEK_DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </Select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="modal-order">Ordem</label>
          <input
            id="modal-order"
            type="number"
            min="1"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 1)}
            className="form-input"
          />
        </div>
        <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => onSave({ weekDay, order })}
          >
            Salvar
          </button>
          <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

ChangeDayModal.propTypes = {
  training: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ─── Step 2: Trainings ────────────────────────────────────────────────────

const Step2Trainings = ({
  step1Data,
  trainings,
  onTrainingsChange,
  trainingTemplates,
  exerciseTemplates,
  onExerciseCreated,
  onSave,
  saving,
  onEditIdentity,
  onDrillChange,
  onRegisterCloseDrill,
  onRegisterCloseExerciseDrill,
}) => {
  const [showDrill, setShowDrill] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [changeDayTraining, setChangeDayTraining] = useState(null);

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (showDrill) {
      onRegisterCloseDrill?.(() => {
        setShowDrill(false);
        setSwapTarget(null);
        onDrillChange?.([]);
      });
    } else {
      onRegisterCloseDrill?.(null);
    }
  }, [showDrill, onRegisterCloseDrill, onDrillChange]);

  const totalExercises = trainings.reduce(
    (sum, t) => sum + (t.exerciseTemplateIds?.length || 0),
    0
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = trainings.findIndex((t) => t._id === active.id);
    const newIndex = trainings.findIndex((t) => t._id === over.id);
    onTrainingsChange(arrayMove(trainings, oldIndex, newIndex).map((t, i) => ({ ...t, order: i + 1 })));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...trainings];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onTrainingsChange(updated.map((t, i) => ({ ...t, order: i + 1 })));
  };

  const handleMoveDown = (index) => {
    if (index >= trainings.length - 1) return;
    const updated = [...trainings];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onTrainingsChange(updated.map((t, i) => ({ ...t, order: i + 1 })));
  };

  const handleRemove = (_id, name) => {
    setConfirmDialog({
      message: `Remover "${name || 'este treino'}" desta rotina? O template continua salvo na sua biblioteca.`,
      onConfirm: () => {
        setConfirmDialog(null);
        onTrainingsChange(trainings.filter((t) => t._id !== _id));
      },
    });
  };

  const closeDrill = () => {
    setShowDrill(false);
    setSwapTarget(null);
    onDrillChange?.([]);
  };

  const handleTrainingSaved = (training) => {
    onTrainingsChange([...trainings, training]);
    closeDrill();
  };

  const handleSwap = (training) => {
    setSwapTarget(training);
    setShowDrill(true);
  };

  const handleSwapSaved = (newTraining) => {
    onTrainingsChange(
      trainings.map((t) =>
        t._id === swapTarget._id ? { ...newTraining, _id: t._id, order: t.order } : t
      )
    );
    closeDrill();
  };

  const handleChangeDaySave = ({ weekDay, order }) => {
    onTrainingsChange(
      trainings.map((t) =>
        t._id === changeDayTraining._id ? { ...t, weekDay, order } : t
      )
    );
    setChangeDayTraining(null);
  };

  const canSave = trainings.length > 0;

  if (showDrill) {
    return (
      <DrillTraining
        trainingTemplates={trainingTemplates}
        exerciseTemplates={exerciseTemplates}
        onSaved={swapTarget ? handleSwapSaved : handleTrainingSaved}
        onBack={closeDrill}
        swapTraining={swapTarget}
        onExerciseCreated={onExerciseCreated}
        existingTrainings={trainings}
        onDrillChange={onDrillChange}
        onRegisterCloseExerciseDrill={onRegisterCloseExerciseDrill}
      />
    );
  }

  return (
    <div className="wizard-body--two-col">
      <aside className="wizard-summary-panel">
        <h3 className="wizard-summary-panel-label">Rotina</h3>
        <div className="wizard-summary-panel-name">{step1Data.name || 'Sem título'}</div>
        {step1Data.description && (
          <div className="wizard-summary-panel-desc">{step1Data.description}</div>
        )}
        <div className="wizard-summary-panel-meta">
          {step1Data.type && (
            <div className="wizard-summary-panel-row">
              <span>Tipo</span>
              <strong>{getProtocolTypeLabel(step1Data.type)}</strong>
            </div>
          )}
          {step1Data.trainingLevel && (
            <div className="wizard-summary-panel-row">
              <span>Nível</span>
              <strong>{getLevelLabel(step1Data.trainingLevel)}</strong>
            </div>
          )}
          {step1Data.genderOrdination && (
            <div className="wizard-summary-panel-row">
              <span>Gênero</span>
              <strong>{getGenderLabel(step1Data.genderOrdination)}</strong>
            </div>
          )}
          {step1Data.defaultDurationWeeks && (
            <div className="wizard-summary-panel-row">
              <span>Duração</span>
              <strong>{step1Data.defaultDurationWeeks} sem.</strong>
            </div>
          )}
          {trainings.length > 0 && (
            <div className="wizard-summary-panel-row">
              <span>Treinos</span>
              <strong>{trainings.length}</strong>
            </div>
          )}
        </div>
        <button type="button" className="wizard-summary-edit" onClick={onEditIdentity}>
          ✎ Editar identidade
        </button>
      </aside>

      <div>
        <RoutineSummaryBar trainings={trainings} />
        <div className="wizard-trainings-header">
          <div>
            <h3 className="wizard-section-title">Treinos da rotina</h3>
            <span className="wizard-counter">
              {trainings.length} treino{trainings.length !== 1 ? 's' : ''} · {totalExercises} exercício{totalExercises !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {trainings.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-state-icon empty-state-icon--accent">
              <Dumbbell size={32} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum treino ainda</p>
            <p>Adicione o primeiro treino a essa rotina.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowDrill(true)}
            >
              <Plus size={16} /> Adicionar primeiro treino
            </button>
          </div>
        ) : (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={trainings.map((t) => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="schedule-template-list fade-in">
                {trainings.map((training, index) => (
                  <SortableTrainingRow
                    key={training._id}
                    training={training}
                    index={index}
                    total={trainings.length}
                    exerciseTemplates={exerciseTemplates}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onSwap={() => handleSwap(training)}
                    onChangeDay={() => setChangeDayTraining(training)}
                    onRemove={() => handleRemove(training._id, training.name)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {trainings.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn-add"
              onClick={() => setShowDrill(true)}
            >
              <Plus size={16} /> Adicionar treino
            </button>
          </div>
        )}

        <div className="wizard-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={onSave}
            disabled={saving || !canSave}
            aria-describedby={!canSave ? 'wiz-save-helper' : undefined}
          >
            {saving ? 'Salvando...' : 'Salvar rotina'}
          </button>
          {!canSave && (
            <span id="wiz-save-helper" className="wizard-footer-helper">Adicione ao menos 1 treino para salvar a rotina.</span>
          )}
        </div>

        {confirmDialog && (
          <div className="overlay" onClick={() => setConfirmDialog(null)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <p className="confirm-dialog-message">{confirmDialog.message}</p>
              <div className="btn-group">
                <button type="button" onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {changeDayTraining && (
          <ChangeDayModal
            training={changeDayTraining}
            onSave={handleChangeDaySave}
            onClose={() => setChangeDayTraining(null)}
          />
        )}
      </div>
    </div>
  );
};

Step2Trainings.propTypes = {
  step1Data: PropTypes.object.isRequired,
  trainings: PropTypes.array.isRequired,
  onTrainingsChange: PropTypes.func.isRequired,
  trainingTemplates: PropTypes.array.isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  onExerciseCreated: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  onEditIdentity: PropTypes.func.isRequired,
  onDrillChange: PropTypes.func,
  onRegisterCloseDrill: PropTypes.func,
  onRegisterCloseExerciseDrill: PropTypes.func,
};

// ─── Main Wizard ──────────────────────────────────────────────────────────

const INITIAL_STEP1 = {
  name: '',
  description: '',
  type: '',
  trainingLevel: '',
  genderOrdination: '',
  defaultDurationWeeks: 12,
};

const ProtocolTemplateWizard = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditing = Boolean(editId);
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState(INITIAL_STEP1);
  const [trainings, setTrainings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [draft, setDraft] = useState(() => (!isEditing ? readDraft() : null));
  const [drillCrumbs, setDrillCrumbs] = useState([]);

  const debounceRef = useRef(null);
  const closeDrillRef = useRef(null);
  const closeExerciseDrillRef = useRef(null);

  const isDirty = useCallback(() => {
    return step1Data.name.trim() !== '' || trainings.length > 0;
  }, [step1Data.name, trainings.length]);

  // Debounced draft save
  useEffect(() => {
    if (isEditing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (isDirty()) {
        saveDraft({ step1: step1Data, trainings });
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [step1Data, trainings, isEditing, isDirty]);

  // Load data on mount
  useEffect(() => {
    const fetchSupporting = async () => {
      try {
        const [ttRes, etRes] = await Promise.all([
          api.get('/trainer/training-templates'),
          api.get('/trainer/exercise-templates'),
        ]);
        setTrainingTemplates(ttRes.data || []);
        setExerciseTemplates(etRes.data || []);
      } catch {
        // non-blocking
      }
    };

    if (isEditing) {
      const loadExisting = async () => {
        setLoading(true);
        try {
          const [protRes, ttRes, etRes] = await Promise.all([
            api.get(`/trainer/protocol-templates/${editId}`),
            api.get('/trainer/training-templates'),
            api.get('/trainer/exercise-templates'),
          ]);
          const full = protRes.data;
          const scheduleItems = full?.scheduleTemplates || full?.trainings || [];
          setStep1Data({
            name: full.name || '',
            description: full.description || '',
            type: full.type?.toLowerCase() || '',
            trainingLevel: full.trainingLevel?.toLowerCase() || '',
            genderOrdination: full.genderOrdination?.toLowerCase() || '',
            defaultDurationWeeks: full.defaultDurationWeeks || 12,
          });
          setTrainingTemplates(ttRes.data || []);
          setExerciseTemplates(etRes.data || []);

          const ttMap = {};
          (ttRes.data || []).forEach((t) => { ttMap[t.id] = t; });

          setTrainings(scheduleItems.map((item) => ({
            _id: crypto.randomUUID(),
            trainingTemplateId: item.trainingTemplate?.id || item.trainingTemplateId,
            name: item.trainingTemplate?.name || ttMap[item.trainingTemplateId]?.name || '—',
            weekDay: (item.weekDay || '').toLowerCase() || '',
            order: item.order,
            exerciseTemplateIds: [],
            savedPill: false,
          })));
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
          navigate('/trainer/protocol-templates');
        } finally {
          setLoading(false);
        }
      };
      loadExisting();
    } else {
      fetchSupporting();
    }
  }, [editId, isEditing, navigate, showToast]);

  const handleDraftContinue = () => {
    if (draft?.data) {
      setStep1Data(draft.data.step1 || INITIAL_STEP1);
      const restoredTrainings = (draft.data.trainings || []).filter(
        (t) => isValidUuid(t.trainingTemplateId)
      );
      setTrainings(restoredTrainings);
    }
    setDraft(null);
  };

  const handleDraftDiscard = () => {
    clearDraft();
    setDraft(null);
  };

  const handleClose = () => {
    if (isDirty()) {
      setConfirmClose(true);
    } else {
      navigate('/trainer/protocol-templates');
    }
  };

  const handleConfirmClose = () => {
    clearDraft();
    navigate('/trainer/protocol-templates');
  };

  const handleExerciseCreated = (exercise) => {
    setExerciseTemplates((prev) => {
      const exists = prev.some((e) => String(e.id) === String(exercise.id));
      return exists ? prev : [...prev, exercise];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(step1Data, trainings);
      if (isEditing) {
        await api.patch(`/trainer/protocol-templates/${editId}`, payload);
        showToast('Rotina atualizada com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocol-templates', payload);
        showToast('Rotina criada com sucesso!', 'success');
      }
      clearDraft();
      navigate('/trainer/protocol-templates');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const wizardTitle = isEditing
    ? (step1Data.name || 'Editar rotina')
    : 'Nova rotina';

  const getBreadcrumbs = () =>
    [wizardTitle, ...drillCrumbs].map((label) => ({ label }));

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="wizard-shell">
      <div className="wizard-header">
        <div className="wizard-topbar">
          <button
            type="button"
            className="wizard-icon-btn"
            onClick={() => {
              if (drillCrumbs.length >= 2 && closeExerciseDrillRef.current) {
                closeExerciseDrillRef.current();
              } else if (drillCrumbs.length >= 1 && closeDrillRef.current) {
                closeDrillRef.current();
              } else if (currentStep === 2) {
                setCurrentStep(1);
              } else {
                handleClose();
              }
            }}
            aria-label={drillCrumbs.length > 0 ? 'Fechar drill' : currentStep === 2 ? 'Voltar ao passo anterior' : 'Voltar à lista'}
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <WizardBreadcrumb crumbs={getBreadcrumbs()} />
          <button
            type="button"
            className="wizard-icon-btn"
            onClick={handleClose}
            aria-label="Fechar wizard"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {drillCrumbs.length === 0 && <WizardStepper currentStep={currentStep} />}
      </div>

      {draft && !isEditing && (
        <DraftRecoveryBanner
          draft={draft}
          onContinue={handleDraftContinue}
          onDiscard={handleDraftDiscard}
        />
      )}

      <div className="wizard-body">
        <div
          className="wizard-slides"
          style={{ marginLeft: `${(currentStep - 1) * -100}%` }}
        >
          <div className="wizard-slide">
            <Step1Identity
              data={step1Data}
              onChange={setStep1Data}
              onNext={() => setCurrentStep(2)}
            />
          </div>
          <div className="wizard-slide">
            <Step2Trainings
              step1Data={step1Data}
              trainings={trainings}
              onTrainingsChange={setTrainings}
              trainingTemplates={trainingTemplates}
              exerciseTemplates={exerciseTemplates}
              onExerciseCreated={handleExerciseCreated}
              onSave={handleSave}
              saving={saving}
              onEditIdentity={() => setCurrentStep(1)}
              onDrillChange={setDrillCrumbs}
              onRegisterCloseDrill={(fn) => { closeDrillRef.current = fn; }}
              onRegisterCloseExerciseDrill={(fn) => { closeExerciseDrillRef.current = fn; }}
            />
          </div>
        </div>
      </div>

      {confirmClose && (
        <div className="overlay" onClick={() => setConfirmClose(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">
              Descartar alterações e sair? Os treinos criados durante esta sessão já foram salvos na sua biblioteca.
            </p>
            <div className="btn-group">
              <button type="button" onClick={handleConfirmClose} className="btn-danger" style={{ flex: 1 }}>
                Descartar e sair
              </button>
              <button type="button" onClick={() => setConfirmClose(false)} className="btn-secondary" style={{ flex: 1 }}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolTemplateWizard;
