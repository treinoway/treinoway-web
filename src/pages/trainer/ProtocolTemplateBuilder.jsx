import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarOff,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Edit3,
  GripVertical,
  Library,
  MoreVertical,
  Plus,
  Save,
  Search,
  X,
  Youtube,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getYoutubeVideoId } from '../../utils/youtube';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import { WEEK_DAY_OPTIONS_SHORT } from '../../constants/weekDays';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';
import { EXERCISE_TYPE_OPTIONS } from '../../constants/exerciseTypes';
import { PROTOCOL_TYPE_OPTIONS } from '../../constants/protocolTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAFT_KEY = 'treinoway:ptbuilder-draft';
const DRAFT_VERSION = 2;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Corpo inteiro' },
];

const WEEK_DAYS_SHORT = [
  { value: 'sunday', label: 'Dom' },
  { value: 'monday', label: 'Seg' },
  { value: 'tuesday', label: 'Ter' },
  { value: 'wednesday', label: 'Qua' },
  { value: 'thursday', label: 'Qui' },
  { value: 'friday', label: 'Sex' },
  { value: 'saturday', label: 'Sáb' },
];

const WEEK_DAY_LABEL = Object.fromEntries(
  WEEK_DAY_OPTIONS_SHORT.map((o) => [o.value, o.label])
);

const getLevelLabel = (val) => TRAINING_LEVEL_OPTIONS.find((o) => o.value === val)?.label || '';
const getGenderLabel = (val) => GENDER_OPTIONS.find((o) => o.value === val)?.label || '';
const getSegmentLabel = (val) => BODY_SEGMENT_OPTIONS.find((o) => o.value === val)?.label || '';

const EMPTY_EXERCISE = {
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

const EMPTY_TRAINING = {
  name: '',
  category: 'strength',
  bodySegment: '',
  weekDay: '',
  estimatedDuration: '',
  description: '',
};

// ─── Draft helpers ────────────────────────────────────────────────────────────

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
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
};

const formatRelativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
};

// ─── Build API payloads ───────────────────────────────────────────────────────

const buildExercisePayload = (form) => {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    hasLoad: form.hasLoad,
  };
  if (form.sets !== '' && form.sets != null) payload.sets = parseInt(form.sets, 10);
  if (form.repetitionsMin !== '' && form.repetitionsMax !== '') {
    payload.repetitions = {
      min: parseInt(form.repetitionsMin, 10),
      max: parseInt(form.repetitionsMax, 10),
    };
  }
  if (form.restInterval !== '') payload.restInterval = parseInt(form.restInterval, 10);
  if (form.videoUrl?.trim()) payload.videoUrl = form.videoUrl.trim();
  const showDuration = form.type !== 'strength';
  if (showDuration && form.duration !== '') payload.duration = parseInt(form.duration, 10);
  if (form.hasLoad && form.suggestedLoad !== '') payload.suggestedLoad = parseFloat(form.suggestedLoad);
  if (form.notes?.trim()) payload.notes = form.notes.trim();
  return payload;
};

const buildTrainingPayload = (form) => ({
  name: form.name.trim(),
  category: form.category,
  ...(form.bodySegment && { bodySegment: form.bodySegment }),
  ...(form.weekDay && { weekDay: form.weekDay }),
  ...(form.estimatedDuration !== '' && { estimatedDuration: parseInt(form.estimatedDuration, 10) }),
  ...(form.description?.trim() && { description: form.description.trim() }),
});

const buildProtocolPayload = (identity, trainings) => ({
  name: identity.name.trim(),
  ...(identity.description?.trim() && { description: identity.description.trim() }),
  ...(identity.type && { type: identity.type }),
  ...(identity.trainingLevel && { trainingLevel: identity.trainingLevel }),
  ...(identity.genderOrdination && { genderOrdination: identity.genderOrdination }),
  defaultDurationWeeks: parseInt(identity.defaultDurationWeeks, 10) || 12,
  trainings: trainings.map((t, idx) => ({
    trainingTemplateId: t.id,
    order: idx,
    ...(t.weekDay && { weekDay: t.weekDay }),
  })),
});

// ─── WeekOverview ─────────────────────────────────────────────────────────────

const WeekOverview = ({ trainings }) => {
  const dayCounts = {};
  let unassigned = 0;
  trainings.forEach((t) => {
    if (t.weekDay) {
      dayCounts[t.weekDay] = (dayCounts[t.weekDay] || 0) + 1;
    } else {
      unassigned += 1;
    }
  });
  const coveredDays = Object.keys(dayCounts).length;

  return (
    <div className="week-overview">
      {WEEK_DAYS_SHORT.map((day) => {
        const count = dayCounts[day.value] || 0;
        const hasTraining = count > 0;
        return (
          <div
            key={day.value}
            className={`week-overview-cell${hasTraining ? ' week-overview-cell--active' : ' week-overview-cell--empty'}`}
          >
            <span className="week-overview-day">{day.label}</span>
            <span className="week-overview-stat">{hasTraining ? count : '–'}</span>
            <span className="week-overview-sub">{hasTraining ? `${count} treino${count > 1 ? 's' : ''}` : 'Livre'}</span>
          </div>
        );
      })}
      {unassigned > 0 && (
        <>
          <div className="week-overview-divider" />
          <div className="week-overview-unassigned">
            <span className="week-overview-day">Sem dia</span>
            <span className="week-overview-stat">{unassigned}</span>
            <span className="week-overview-sub">{unassigned} treino{unassigned > 1 ? 's' : ''}</span>
          </div>
        </>
      )}
      {trainings.length === 0 && (
        <div style={{ paddingLeft: 'var(--spacing-sm)', fontSize: '11px', color: 'var(--brand-steel)', alignSelf: 'center' }}>
          Nenhum treino adicionado ainda
        </div>
      )}
      {/* Hidden from CSS on mobile but visible on ≥768px */}
      <div style={{ marginLeft: 'auto', paddingLeft: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span className="canvas-section-hint">{coveredDays}/7 dias</span>
      </div>
    </div>
  );
};

WeekOverview.propTypes = {
  trainings: PropTypes.array.isRequired,
};

// ─── WeekdayChip ─────────────────────────────────────────────────────────────

const WeekdayChip = ({ value, onChange }) => {
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

  const handleKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref} onKeyDown={handleKey}>
      <button
        type="button"
        className={`weekday-chip${value ? ' weekday-chip--set' : ' weekday-chip--unassigned'}`}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={value ? `Dia: ${WEEK_DAY_LABEL[value] || value}` : 'Atribuir dia da semana'}
      >
        <Calendar size={11} strokeWidth={2} />
        {value ? (WEEK_DAY_LABEL[value] || value) : 'Atribuir dia'}
        <ChevronDown size={10} strokeWidth={2} />
      </button>
      {open && (
        <div className="weekday-popover" role="listbox" aria-label="Dia da semana">
          <button
            type="button"
            className={`weekday-popover-item${!value ? ' weekday-popover-item--active' : ''}`}
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            Sem dia atribuído
          </button>
          {WEEK_DAY_OPTIONS_SHORT.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`weekday-popover-item${value === opt.value ? ' weekday-popover-item--active' : ''}`}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

WeekdayChip.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

// ─── ExerciseComposer ─────────────────────────────────────────────────────────

const ExerciseComposer = ({ onSave, onCancel, exerciseTemplates, loading }) => {
  const [mode, setMode] = useState('create'); // 'create' | 'library'
  const [form, setForm] = useState({ ...EMPTY_EXERCISE });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
  const [errors, setErrors] = useState({});

  const videoId = getYoutubeVideoId(form.videoUrl);
  const showDuration = form.type !== 'strength';

  const setField = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome obrigatório';
    if (!form.type) errs.type = 'Tipo obrigatório';
    return errs;
  };

  const handleSaveCreate = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ mode: 'create', payload: buildExercisePayload(form) });
  };

  const handleSaveLibrary = () => {
    if (!selectedLibraryIds.length) return;
    onSave({ mode: 'library', ids: selectedLibraryIds });
  };

  const filteredLibrary = exerciseTemplates.filter((ex) =>
    librarySearch === '' || ex.name.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const toggleLibraryItem = (id) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="inline-composer-wide">
      <div className="inline-composer-title">
        <Plus size={12} strokeWidth={2} />
        Adicionar exercício
      </div>

      <div className="segmented-toggle" style={{ marginBottom: 'var(--spacing-sm)' }}>
        <button
          type="button"
          className={`segmented-toggle-btn${mode === 'create' ? ' active' : ''}`}
          onClick={() => setMode('create')}
        >
          Criar novo
        </button>
        <button
          type="button"
          className={`segmented-toggle-btn${mode === 'library' ? ' active' : ''}`}
          onClick={() => setMode('library')}
        >
          Da biblioteca
        </button>
      </div>

      {mode === 'create' && (
        <>
          <div className="composer-name-type-row">
            <div>
              <label className="composer-label">
                Nome <span aria-hidden="true" style={{ color: 'var(--md-error)' }}>*</span>
              </label>
              <input
                className={`composer-input${errors.name ? ' form-input--error' : ''}`}
                placeholder="Ex: Remada unilateral"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                aria-label="Nome do exercício"
                aria-required="true"
              />
              {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
            </div>
            <div>
              <label className="composer-label">
                Tipo <span aria-hidden="true" style={{ color: 'var(--md-error)' }}>*</span>
              </label>
              <select
                className="composer-select"
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
                aria-label="Tipo do exercício"
                aria-required="true"
              >
                <option value="">Selecionar…</option>
                {EXERCISE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.type && <span className="form-error" role="alert">{errors.type}</span>}
            </div>
          </div>

          <div className="composer-sets-row">
            <div>
              <label className="composer-label">Séries</label>
              <input
                className="composer-input"
                placeholder="3"
                type="number"
                min="1"
                value={form.sets}
                onChange={(e) => setField('sets', e.target.value)}
                aria-label="Número de séries"
              />
            </div>
            <div>
              <label className="composer-label">Reps (mín — máx)</label>
              <div className="composer-reps-pair">
                <input
                  className="composer-input"
                  placeholder="8"
                  type="number"
                  min="1"
                  value={form.repetitionsMin}
                  onChange={(e) => setField('repetitionsMin', e.target.value)}
                  aria-label="Repetições mínimas"
                />
                <span className="composer-reps-sep">—</span>
                <input
                  className="composer-input"
                  placeholder="12"
                  type="number"
                  min="1"
                  value={form.repetitionsMax}
                  onChange={(e) => setField('repetitionsMax', e.target.value)}
                  aria-label="Repetições máximas"
                />
              </div>
            </div>
            <div>
              <label className="composer-label">Descanso (s)</label>
              <input
                className="composer-input"
                placeholder="60"
                type="number"
                min="0"
                value={form.restInterval}
                onChange={(e) => setField('restInterval', e.target.value)}
                aria-label="Intervalo de descanso em segundos"
              />
            </div>
          </div>

          <button
            type="button"
            className="composer-more-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            <span className={`composer-more-toggle-icon${showAdvanced ? ' composer-more-toggle-icon--open' : ''}`}>
              <ChevronDown size={12} strokeWidth={2} />
            </span>
            {showAdvanced ? 'Ocultar campos avançados' : 'Mostrar mais campos'}
          </button>

          {showAdvanced && (
            <div className="composer-advanced">
              <div>
                <label className="composer-label">
                  URL do vídeo{' '}
                  <span style={{ color: 'var(--brand-steel)', fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: '10px' }}>
                    (YouTube)
                  </span>
                </label>
                <div className="composer-video-wrap">
                  <Youtube size={14} strokeWidth={2} className="composer-video-icon" aria-hidden="true" />
                  <input
                    className="composer-input composer-input--video"
                    placeholder="https://youtube.com/watch?v=…"
                    value={form.videoUrl}
                    onChange={(e) => setField('videoUrl', e.target.value)}
                    aria-label="URL do vídeo no YouTube"
                  />
                  {videoId && (
                    <span className="composer-video-ok" aria-live="polite">
                      <Check size={10} strokeWidth={2} />Preview OK
                    </span>
                  )}
                </div>
                {videoId && (
                  <div className="composer-video-preview" aria-label="Preview do vídeo">
                    <Youtube size={40} strokeWidth={2} className="composer-video-preview-icon" />
                  </div>
                )}
              </div>

              <div className={showDuration ? '' : 'composer-duration-field--disabled'}>
                <label className="composer-label">
                  Duração (s){' '}
                  <span style={{ color: 'var(--brand-steel)', fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: '10px' }}>
                    — cardio, mobilidade ou alongamento
                  </span>
                </label>
                <input
                  className="composer-input"
                  placeholder={showDuration ? '600' : 'Não se aplica a exercícios de força'}
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => setField('duration', e.target.value)}
                  disabled={!showDuration}
                  aria-label="Duração em segundos"
                  aria-disabled={!showDuration}
                />
              </div>

              <div className="composer-load-row">
                <label className="composer-checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.hasLoad}
                    onChange={(e) => setField('hasLoad', e.target.checked)}
                  />
                  Exercício com carga
                </label>
                {form.hasLoad && (
                  <div>
                    <label className="composer-label">Carga sugerida (kg)</label>
                    <input
                      className="composer-input"
                      placeholder="20"
                      type="number"
                      min="0"
                      value={form.suggestedLoad}
                      onChange={(e) => setField('suggestedLoad', e.target.value)}
                      aria-label="Carga sugerida em quilogramas"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="composer-label">Observações</label>
                <textarea
                  className="composer-textarea"
                  placeholder="Dica de execução, postura, foco muscular…"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  aria-label="Observações do exercício"
                />
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'library' && (
        <div className="library-panel">
          <div className="library-search">
            <Search size={14} strokeWidth={2} aria-hidden="true" />
            <input
              type="text"
              className="library-search-input"
              placeholder="Buscar exercício na biblioteca…"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              aria-label="Buscar exercício"
            />
          </div>
          <div className="library-list" role="listbox" aria-label="Exercícios da biblioteca" aria-multiselectable="true">
            {filteredLibrary.length === 0 && (
              <div className="library-empty">
                {librarySearch ? `Nenhum resultado para "${librarySearch}"` : 'Biblioteca vazia — crie exercícios primeiro.'}
              </div>
            )}
            {filteredLibrary.map((ex) => {
              const selected = selectedLibraryIds.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  className={`library-item${selected ? ' library-item--selected' : ''}`}
                  onClick={() => toggleLibraryItem(ex.id)}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleLibraryItem(ex.id)}
                >
                  <div className="library-item-check" aria-hidden="true">
                    {selected && <Check size={12} strokeWidth={2} />}
                  </div>
                  <div className="library-item-body">
                    <span className="library-item-name">{ex.name}</span>
                    <span className="library-item-meta">
                      {ex.type && (
                        <span className="library-item-cat">
                          {EXERCISE_TYPE_OPTIONS.find((o) => o.value === ex.type)?.label || ex.type}
                        </span>
                      )}
                      {formatExerciseMeta(ex)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="library-selection-bar">
            <span>
              <span className="library-selection-count">{selectedLibraryIds.length}</span>
              {' '}selecionado{selectedLibraryIds.length !== 1 ? 's' : ''}
            </span>
            <span>{exerciseTemplates.length} na biblioteca</span>
          </div>
        </div>
      )}

      <div className="composer-actions">
        <button type="button" className="btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        {mode === 'create' ? (
          <button type="button" className="btn-primary btn-sm" onClick={handleSaveCreate} disabled={loading}>
            {loading ? 'Salvando…' : (
              <><Check size={14} strokeWidth={2} />Salvar &amp; próximo</>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleSaveLibrary}
            disabled={loading || selectedLibraryIds.length === 0}
          >
            {loading ? 'Adicionando…' : (
              <><Plus size={14} strokeWidth={2} />Adicionar {selectedLibraryIds.length > 0 ? selectedLibraryIds.length : ''}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

ExerciseComposer.propTypes = {
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  loading: PropTypes.bool,
};

// ─── TrainingItem ─────────────────────────────────────────────────────────────

const TrainingItem = ({ training, index, exerciseTemplates, onWeekDayChange, onExerciseAdded, onDelete, onEdit }) => {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [savingExercise, setSavingExercise] = useState(false);
  const [exercises, setExercises] = useState(training.exercises || []);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const letter = String.fromCharCode(65 + index); // A, B, C…
  const hasExercises = exercises.length > 0;
  const readiness = !hasExercises ? 'empty' : exercises.length >= 4 ? 'ready' : 'partial';

  const handleSaveExercise = async ({ mode, payload, ids }) => {
    setSavingExercise(true);
    try {
      if (mode === 'create') {
        const res = await api.post(`/trainer/training-templates/${training.id}/exercise-templates`, payload);
        const newEx = res.data;
        setExercises((prev) => [...prev, newEx]);
        if (onExerciseAdded) onExerciseAdded(training.id, newEx);
        showToast('Exercício criado.', 'success');
        setComposerOpen(false);
      } else {
        // from library: add each selected exercise template to this training
        const added = [];
        for (const exId of ids) {
          const res = await api.post(`/trainer/training-templates/${training.id}/exercise-templates/from-template`, {
            exerciseTemplateId: exId,
          });
          added.push(res.data);
        }
        setExercises((prev) => [...prev, ...added]);
        showToast(`${added.length} exercício${added.length > 1 ? 's' : ''} adicionado${added.length > 1 ? 's' : ''}.`, 'success');
        setComposerOpen(false);
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSavingExercise(false);
    }
  };

  const handleRemoveExercise = async (exId) => {
    try {
      await api.delete(`/trainer/training-templates/${training.id}/exercise-templates/${exId}`);
      setExercises((prev) => prev.filter((e) => e.id !== exId));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const categoryLabel = TRAINING_CATEGORY_LABEL[training.category] || training.category || '';
  const segmentLabel = getSegmentLabel(training.bodySegment);
  const subtitle = [categoryLabel, segmentLabel].filter(Boolean).join(' · ');

  const metaExCount = `${exercises.length} exercício${exercises.length !== 1 ? 's' : ''}`;
  const metaDuration = training.estimatedDuration ? `~${training.estimatedDuration}min` : null;

  return (
    <div
      className={`training-item${readiness === 'ready' ? ' training-item--ready' : readiness === 'partial' ? ' training-item--partial' : ''}${expanded ? ' training-item--expanded' : ''}`}
    >
      {/* Head — click to expand/collapse */}
      <div
        className="training-item-head"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
        aria-controls={`training-body-${training.id}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      >
        <GripVertical size={16} strokeWidth={2} className="training-item-drag" aria-hidden="true" />

        <span className="training-item-letter" aria-hidden="true">{letter}</span>

        <div className="training-item-main">
          <div className="training-item-title-row">
            <span className="training-item-title">{training.name}</span>
            {subtitle && (
              <span className="training-item-subtitle">{subtitle}</span>
            )}
          </div>
          <div className="training-item-meta">
            <WeekdayChip
              value={training.weekDay}
              onChange={(val) => onWeekDayChange(training.id, val)}
            />
            <span className="training-item-meta-stat">{metaExCount}</span>
            {metaDuration && (
              <>
                <span className="training-item-meta-sep" aria-hidden="true">·</span>
                <span className="training-item-meta-stat">{metaDuration}</span>
              </>
            )}
            {!hasExercises && (
              <>
                <span className="training-item-meta-sep" aria-hidden="true">·</span>
                <span className="training-item-meta-warn">Sem exercícios</span>
              </>
            )}
          </div>
        </div>

        <div className="training-item-actions" onClick={(e) => e.stopPropagation()}>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              className="training-item-menu-btn"
              aria-label={`Opções do treino ${training.name}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical size={16} strokeWidth={2} />
            </button>
            {menuOpen && (
              <div className="row-menu" role="menu">
                <button
                  type="button"
                  className="row-menu-item"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onEdit(training); }}
                >
                  Editar treino
                </button>
                <button
                  type="button"
                  className="row-menu-item row-menu-item--danger"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDelete(training); }}
                >
                  Excluir treino
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`training-item-chevron${expanded ? ' training-item-chevron--open' : ''}`}
            aria-label={expanded ? 'Recolher treino' : 'Expandir treino'}
          >
            <ChevronDown size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Body — expanded zone */}
      {expanded && (
        <div className="training-item-body" id={`training-body-${training.id}`}>
          {!hasExercises && !composerOpen ? (
            <div className="training-empty-hero">
              <div className="training-empty-hero-icon">
                <Dumbbell size={22} strokeWidth={2} />
              </div>
              <div className="training-empty-hero-title">Treino {letter} sem exercícios</div>
              <div className="training-empty-hero-desc">
                Crie o primeiro exercício — do zero ou puxe da sua biblioteca.
              </div>
              <div className="training-empty-hero-actions">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => setComposerOpen(true)}
                >
                  <Plus size={14} strokeWidth={2} />Adicionar primeiro exercício
                </button>
              </div>
            </div>
          ) : (
            <>
              {hasExercises && (
                <>
                  <div className="training-body-section-title">
                    <span>Exercícios · {exercises.length}</span>
                    <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>
                      Arraste pelo índice para reordenar
                    </span>
                  </div>
                  <div className="exercise-list-wide">
                    {exercises.map((ex, i) => (
                      <div key={ex.id} className="exercise-row-wide">
                        <span className="exercise-row-index">{i + 1}</span>
                        <div className="exercise-row-wide-body">
                          <span className="exercise-row-wide-name">{ex.name}</span>
                          <span className="exercise-row-wide-meta">{formatExerciseMeta(ex)}</span>
                        </div>
                        <button
                          type="button"
                          className="exercise-row-menu-btn"
                          aria-label={`Remover exercício ${ex.name}`}
                          onClick={() => handleRemoveExercise(ex.id)}
                        >
                          <MoreVertical size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {composerOpen ? (
                <ExerciseComposer
                  onSave={handleSaveExercise}
                  onCancel={() => setComposerOpen(false)}
                  exerciseTemplates={exerciseTemplates}
                  loading={savingExercise}
                />
              ) : (
                <button
                  type="button"
                  className="inline-add-btn-wide"
                  onClick={() => setComposerOpen(true)}
                >
                  <Plus size={14} strokeWidth={2} />Adicionar exercício
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

TrainingItem.propTypes = {
  training: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  exerciseTemplates: PropTypes.array.isRequired,
  onWeekDayChange: PropTypes.func.isRequired,
  onExerciseAdded: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

// ─── TrainingSheet ────────────────────────────────────────────────────────────

const TrainingSheet = ({ routineName, onClose, onSave, trainingTemplates, editingTraining }) => {
  const isEditing = !!editingTraining;
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({
    ...EMPTY_TRAINING,
    ...(isEditing ? {
      name: editingTraining.name || '',
      category: editingTraining.category || 'strength',
      bodySegment: editingTraining.bodySegment || '',
      weekDay: editingTraining.weekDay || '',
      estimatedDuration: editingTraining.estimatedDuration ?? '',
      description: editingTraining.description || '',
    } : {}),
  });
  const [showDescription, setShowDescription] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const validateCreate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nome obrigatório';
    if (!form.category) errs.category = 'Categoria obrigatória';
    return errs;
  };

  const handleSubmitCreate = async () => {
    const errs = validateCreate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSave({ mode: 'create', payload: buildTrainingPayload(form) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLibrary = async () => {
    if (!selectedLibraryIds.length) return;
    setLoading(true);
    try {
      await onSave({ mode: 'library', ids: selectedLibraryIds });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = trainingTemplates.filter((t) =>
    librarySearch === '' || t.name.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const toggleTemplate = (id) =>
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  return (
    <div
      className="builder-sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar treino' : 'Adicionar treino'}
    >
      <div className="builder-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="builder-sheet-handle" aria-hidden="true" />
        <div className="builder-sheet-header">
          <div className="builder-sheet-title-wrap">
            <div className="builder-sheet-eyebrow">{routineName || 'Rotina'}</div>
            <div className="builder-sheet-title">
              {isEditing ? 'Editar treino' : 'Adicionar treino'}
            </div>
          </div>
          <button
            type="button"
            className="builder-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="builder-sheet-body">
          {!isEditing && (
            <div className="segmented-toggle" style={{ marginBottom: 'var(--spacing-md)' }}>
              <button
                type="button"
                className={`segmented-toggle-btn${mode === 'create' ? ' active' : ''}`}
                onClick={() => setMode('create')}
              >
                Criar novo
              </button>
              <button
                type="button"
                className={`segmented-toggle-btn${mode === 'library' ? ' active' : ''}`}
                onClick={() => setMode('library')}
              >
                Da biblioteca
              </button>
            </div>
          )}

          {(mode === 'create' || isEditing) && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="training-name">
                  Nome do treino <span aria-hidden="true" style={{ color: 'var(--md-error)' }}>*</span>
                </label>
                <input
                  id="training-name"
                  className={`form-input${errors.name ? ' form-input--error' : ''}`}
                  placeholder="Ex: Costas &amp; Bíceps"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  aria-required="true"
                />
                {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
                <span className="form-hint">Será salvo na sua biblioteca de treinos.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="training-category">
                    Categoria <span aria-hidden="true" style={{ color: 'var(--md-error)' }}>*</span>
                  </label>
                  <select
                    id="training-category"
                    className={`form-input${errors.category ? ' form-input--error' : ''}`}
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    aria-required="true"
                  >
                    {TRAINING_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {errors.category && <span className="form-error" role="alert">{errors.category}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="training-segment">Segmento</label>
                  <select
                    id="training-segment"
                    className="form-input"
                    value={form.bodySegment}
                    onChange={(e) => setField('bodySegment', e.target.value)}
                  >
                    <option value="">— Selecionar —</option>
                    {BODY_SEGMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="training-weekday">
                  Dia da semana{' '}
                  <span style={{ color: 'var(--brand-steel)', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>
                    (opcional)
                  </span>
                </label>
                <select
                  id="training-weekday"
                  className="form-input"
                  value={form.weekDay}
                  onChange={(e) => setField('weekDay', e.target.value)}
                >
                  <option value="">Sem dia atribuído</option>
                  {WEEK_DAY_OPTIONS_SHORT.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="form-hint">Você pode atribuir depois direto pelo chip no card.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="training-duration">
                  Duração estimada (min){' '}
                  <span style={{ color: 'var(--brand-steel)', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>
                    (opcional)
                  </span>
                </label>
                <input
                  id="training-duration"
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="45"
                  value={form.estimatedDuration}
                  onChange={(e) => setField('estimatedDuration', e.target.value)}
                />
              </div>

              <button
                type="button"
                className="composer-more-toggle"
                onClick={() => setShowDescription((v) => !v)}
                style={{ marginBottom: 'var(--spacing-sm)' }}
              >
                <span className={`composer-more-toggle-icon${showDescription ? ' composer-more-toggle-icon--open' : ''}`}>
                  <ChevronDown size={12} strokeWidth={2} />
                </span>
                {showDescription ? 'Ocultar descrição' : 'Mostrar mais campos'}
              </button>

              {showDescription && (
                <div className="form-group">
                  <label className="form-label" htmlFor="training-description">
                    Descrição{' '}
                    <span style={{ color: 'var(--brand-steel)', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    id="training-description"
                    className="form-input"
                    style={{ minHeight: '72px', resize: 'vertical' }}
                    placeholder="Objetivo, observações gerais…"
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                  <span className="form-hint">Aparece no card e ajuda a identificar o treino.</span>
                </div>
              )}

              <div className="info-banner" style={{ marginTop: 'var(--spacing-sm)' }}>
                <span className="info-banner-icon"><BookOpen size={16} strokeWidth={2} /></span>
                <span>
                  Os exercícios são adicionados <strong>direto no card do treino</strong>, inline. Você não sai desta rotina.
                </span>
              </div>
            </>
          )}

          {mode === 'library' && !isEditing && (
            <>
              <div className="library-search" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <Search size={14} strokeWidth={2} aria-hidden="true" />
                <input
                  type="text"
                  className="library-search-input"
                  placeholder="Buscar treino na biblioteca…"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  aria-label="Buscar treino"
                />
              </div>
              <div className="library-list" style={{ maxHeight: '320px' }} role="listbox" aria-label="Treinos da biblioteca" aria-multiselectable="true">
                {filteredTemplates.length === 0 && (
                  <div className="library-empty">
                    {librarySearch ? `Nenhum resultado para "${librarySearch}"` : 'Nenhum treino na biblioteca ainda.'}
                  </div>
                )}
                {filteredTemplates.map((t) => {
                  const selected = selectedLibraryIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      className={`library-item${selected ? ' library-item--selected' : ''}`}
                      onClick={() => toggleTemplate(t.id)}
                      role="option"
                      aria-selected={selected}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleTemplate(t.id)}
                    >
                      <div className="library-item-check" aria-hidden="true">
                        {selected && <Check size={12} strokeWidth={2} />}
                      </div>
                      <div className="library-item-body">
                        <span className="library-item-name">{t.name}</span>
                        <span className="library-item-meta">
                          {t.category && (
                            <span className="library-item-cat">
                              {TRAINING_CATEGORY_LABEL[t.category] || t.category}
                            </span>
                          )}
                          {t.bodySegment && getSegmentLabel(t.bodySegment)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="library-selection-bar" style={{ marginTop: 'var(--spacing-xs)' }}>
                <span>
                  <span className="library-selection-count">{selectedLibraryIds.length}</span>
                  {' '}selecionado{selectedLibraryIds.length !== 1 ? 's' : ''}
                </span>
                <span>{trainingTemplates.length} na biblioteca</span>
              </div>
            </>
          )}
        </div>

        <div className="builder-sheet-footer">
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={loading}>
            Cancelar
          </button>
          {(mode === 'create' || isEditing) ? (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmitCreate}
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Salvando…' : (
                <><Plus size={16} strokeWidth={2} />{isEditing ? 'Salvar alterações' : 'Adicionar e abrir'}</>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmitLibrary}
              style={{ flex: 1 }}
              disabled={loading || selectedLibraryIds.length === 0}
            >
              {loading ? 'Adicionando…' : (
                <><Plus size={16} strokeWidth={2} />Adicionar {selectedLibraryIds.length > 0 ? selectedLibraryIds.length : ''}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

TrainingSheet.propTypes = {
  routineName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  trainingTemplates: PropTypes.array.isRequired,
  editingTraining: PropTypes.object,
};

// ─── IdentityChipField ────────────────────────────────────────────────────────

const IdentityChipField = ({ label, value, displayValue, options, onSelect, emptyLabel }) => {
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
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        className={`identity-chip${!value ? ' identity-chip--empty' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={value ? `${label}: ${displayValue}` : `Definir ${label}`}
      >
        {!value && <Plus size={12} strokeWidth={2} />}
        {value ? (
          <>
            <span className="identity-chip-label">{label}</span>
            <span className="identity-chip-value">{displayValue}</span>
            <ChevronDown size={10} strokeWidth={2} />
          </>
        ) : (
          emptyLabel || label
        )}
      </button>
      {open && (
        <div className="weekday-popover" role="listbox" aria-label={label} style={{ minWidth: '180px' }}>
          <button
            type="button"
            className={`weekday-popover-item${!value ? ' weekday-popover-item--active' : ''}`}
            role="option"
            aria-selected={!value}
            onClick={() => { onSelect(''); setOpen(false); }}
          >
            — Não definido —
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`weekday-popover-item${value === opt.value ? ' weekday-popover-item--active' : ''}`}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

IdentityChipField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  displayValue: PropTypes.string,
  options: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  emptyLabel: PropTypes.string,
};

// ─── WeeksChipField ───────────────────────────────────────────────────────────

const WEEK_OPTIONS = [4, 6, 8, 10, 12, 16, 20, 24].map((w) => ({ value: String(w), label: `${w} semanas` }));

const WeeksChipField = ({ value, onSelect }) => (
  <IdentityChipField
    label="Dur."
    value={value}
    displayValue={value ? `${value} sem.` : ''}
    options={WEEK_OPTIONS}
    onSelect={onSelect}
    emptyLabel="Duração"
  />
);

WeeksChipField.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

// ─── Main ProtocolTemplateBuilder ─────────────────────────────────────────────

const ProtocolTemplateBuilder = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditing = !!editId;
  const { showToast } = useToast();

  // ── Load state ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Identity fields ──
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef(null);

  const [identity, setIdentity] = useState({
    type: '',
    trainingLevel: '',
    defaultDurationWeeks: '',
    genderOrdination: '',
    description: '',
  });

  // ── Training list ──
  const [trainings, setTrainings] = useState([]);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);

  // ── Sheet state ──
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);

  // ── Confirm dialog ──
  const [confirmDialog, setConfirmDialog] = useState(null);

  // ── Save status ──
  const [lastSaved, setLastSaved] = useState(null);

  // ── Autosave draft (local, not to server) ──
  const draftTimer = useRef(null);

  const scheduleAutosave = useCallback(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft({ name, identity, trainings });
      setLastSaved(new Date().toISOString());
    }, 1500);
  }, [name, identity, trainings]);

  useEffect(() => {
    scheduleAutosave();
    return () => clearTimeout(draftTimer.current);
  }, [scheduleAutosave]);

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isEditing) {
          const [templateRes, trainingRes, exerciseRes] = await Promise.all([
            api.get(`/trainer/protocol-templates/${editId}`),
            api.get('/trainer/training-templates'),
            api.get('/trainer/exercise-templates'),
          ]);
          const tmpl = templateRes.data;
          setName(tmpl.name || '');
          setIdentity({
            type: tmpl.type || '',
            trainingLevel: tmpl.trainingLevel || '',
            defaultDurationWeeks: tmpl.defaultDurationWeeks ? String(tmpl.defaultDurationWeeks) : '',
            genderOrdination: tmpl.genderOrdination || '',
            description: tmpl.description || '',
          });
          // Build training list from protocol trainings
          const linked = (tmpl.trainings || tmpl.scheduleTemplates || []).map((st) => ({
            id: st.trainingTemplate?.id || st.id,
            name: st.trainingTemplate?.name || st.name,
            category: st.trainingTemplate?.category || st.category,
            bodySegment: st.trainingTemplate?.bodySegment || st.bodySegment,
            weekDay: st.weekDay,
            estimatedDuration: st.trainingTemplate?.estimatedDuration || st.estimatedDuration,
            description: st.trainingTemplate?.description || st.description,
            exercises: st.trainingTemplate?.exerciseTemplates || st.exerciseTemplates || [],
          }));
          setTrainings(linked);
          setTrainingTemplates(trainingRes.data || []);
          setExerciseTemplates(exerciseRes.data || []);
        } else {
          const [trainingRes, exerciseRes] = await Promise.all([
            api.get('/trainer/training-templates'),
            api.get('/trainer/exercise-templates'),
          ]);
          setTrainingTemplates(trainingRes.data || []);
          setExerciseTemplates(exerciseRes.data || []);
        }
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editId, isEditing, showToast]);

  // ── Name editing ──
  const handleNameClick = () => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleNameBlur = () => setEditingName(false);

  const handleNameKey = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingName(false);
    }
  };

  // ── Weekday change on training card ──
  const handleWeekDayChange = useCallback((trainingId, weekDay) => {
    setTrainings((prev) =>
      prev.map((t) => (t.id === trainingId ? { ...t, weekDay } : t))
    );
  }, []);

  // ── Add / edit training via sheet ──
  const handleSheetSave = async ({ mode, payload, ids }) => {
    try {
      if (mode === 'create') {
        const res = await api.post('/trainer/training-templates', payload);
        const newTraining = { ...res.data, exercises: [] };
        setTrainings((prev) => [...prev, newTraining]);
        setTrainingTemplates((prev) => [...prev, res.data]);
        showToast('Treino adicionado.', 'success');
        setSheetOpen(false);
        setEditingTraining(null);
      } else if (mode === 'library') {
        const added = [];
        for (const tid of ids) {
          const found = trainingTemplates.find((t) => t.id === tid);
          if (found) added.push({ ...found, exercises: found.exerciseTemplates || [] });
        }
        setTrainings((prev) => [...prev, ...added]);
        showToast(`${added.length} treino${added.length > 1 ? 's' : ''} adicionado${added.length > 1 ? 's' : ''}.`, 'success');
        setSheetOpen(false);
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      throw error;
    }
  };

  const handleEditTraining = async ({ payload }) => {
    if (!editingTraining) return;
    try {
      const res = await api.patch(`/trainer/training-templates/${editingTraining.id}`, payload);
      setTrainings((prev) =>
        prev.map((t) => (t.id === editingTraining.id ? { ...t, ...res.data } : t))
      );
      showToast('Treino atualizado.', 'success');
      setSheetOpen(false);
      setEditingTraining(null);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      throw error;
    }
  };

  const openEditTraining = (training) => {
    setEditingTraining(training);
    setSheetOpen(true);
  };

  const handleDeleteTraining = (training) => {
    setConfirmDialog({
      message: `Excluir "${training.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        setConfirmDialog(null);
        setTrainings((prev) => prev.filter((t) => t.id !== training.id));
        showToast('Treino removido da rotina.', 'success');
      },
    });
  };

  // ── Save protocol ──
  const canSave = name.trim().length > 0 && trainings.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = buildProtocolPayload(
        { ...identity, name },
        trainings
      );
      if (isEditing) {
        await api.patch(`/trainer/protocol-templates/${editId}`, payload);
        showToast('Rotina atualizada.', 'success');
      } else {
        await api.post('/trainer/protocol-templates', payload);
        showToast('Rotina salva.', 'success');
      }
      clearDraft();
      navigate('/trainer/protocol-templates');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/trainer/protocol-templates');
  };

  // ── Stats ──
  const totalExercises = trainings.reduce((sum, t) => sum + (t.exercises?.length || 0), 0);
  const assignedDays = new Set(trainings.filter((t) => t.weekDay).map((t) => t.weekDay)).size;
  const avgDuration =
    trainings.length > 0
      ? Math.round(
          trainings.filter((t) => t.estimatedDuration).reduce((s, t) => s + (t.estimatedDuration || 0), 0) /
            (trainings.filter((t) => t.estimatedDuration).length || 1)
        )
      : 0;

  // ── Split trainings by weekDay presence ──
  const assignedTrainings = trainings.filter((t) => t.weekDay);
  const unassignedTrainings = trainings.filter((t) => !t.weekDay);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando…</span>
      </div>
    );
  }

  return (
    <div className="builder-shell">
      {/* ── Topbar ── */}
      <div className="builder-topbar">
        <button
          type="button"
          className="builder-topbar-back"
          onClick={handleBack}
          aria-label="Voltar à lista de rotinas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="builder-title-wrap">
          <div className="builder-eyebrow">
            {lastSaved ? (
              <>
                <span className="builder-eyebrow-saved" aria-hidden="true">●</span>
                {isEditing ? 'Editando rotina' : 'Nova rotina'} · Rascunho salvo {formatRelativeTime(lastSaved)}
              </>
            ) : (
              <>{isEditing ? 'Editando rotina' : 'Nova rotina'} · Rascunho</>
            )}
          </div>
          <div
            className="builder-title-input-wrap"
            onClick={handleNameClick}
            role="button"
            tabIndex={editingName ? -1 : 0}
            onKeyDown={(e) => e.key === 'Enter' && handleNameClick()}
            aria-label="Editar nome da rotina"
          >
            {editingName ? (
              <input
                ref={nameInputRef}
                className="builder-title-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKey}
                placeholder="Nomear rotina…"
                aria-label="Nome da rotina"
              />
            ) : (
              <>
                <span className={`builder-title-display${!name ? ' builder-title-display--empty' : ''}`}>
                  {name || 'Nomear rotina…'}
                </span>
                <Edit3 size={13} strokeWidth={2} className="builder-title-edit-icon" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

        <div className="builder-topbar-actions">
          {lastSaved && (
            <span className="builder-save-status" aria-live="polite">
              <Save size={12} strokeWidth={2} style={{ color: 'var(--md-success)' }} aria-hidden="true" />
              Salvo {formatRelativeTime(lastSaved)}
            </span>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleBack}
          >
            <X size={14} strokeWidth={2} />
            <span className="table-col-desktop-only">Cancelar</span>
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleSave}
            disabled={!canSave || saving}
            aria-disabled={!canSave}
          >
            <Save size={14} strokeWidth={2} />
            {saving ? 'Salvando…' : 'Salvar rotina'}
          </button>
        </div>
      </div>

      {/* ── Identity strip ── */}
      <div className="builder-identity-strip">
        <span className="identity-strip-label" aria-hidden="true">Identidade:</span>
        <IdentityChipField
          label="Tipo"
          value={identity.type}
          displayValue={PROTOCOL_TYPE_OPTIONS.find((o) => o.value === identity.type)?.label || ''}
          options={PROTOCOL_TYPE_OPTIONS}
          onSelect={(val) => setIdentity((i) => ({ ...i, type: val }))}
          emptyLabel="Tipo"
        />
        <IdentityChipField
          label="Nível"
          value={identity.trainingLevel}
          displayValue={getLevelLabel(identity.trainingLevel)}
          options={TRAINING_LEVEL_OPTIONS}
          onSelect={(val) => setIdentity((i) => ({ ...i, trainingLevel: val }))}
          emptyLabel="Nível"
        />
        <WeeksChipField
          value={identity.defaultDurationWeeks}
          onSelect={(val) => setIdentity((i) => ({ ...i, defaultDurationWeeks: val }))}
        />
        <IdentityChipField
          label="Gênero"
          value={identity.genderOrdination}
          displayValue={getGenderLabel(identity.genderOrdination)}
          options={GENDER_OPTIONS}
          onSelect={(val) => setIdentity((i) => ({ ...i, genderOrdination: val }))}
          emptyLabel="Gênero"
        />
      </div>

      {/* ── Stats row ── */}
      <div className="builder-stats-row" aria-label="Resumo da rotina">
        <div className={`builder-stat-card${trainings.length > 0 ? ' builder-stat-card--accent' : ''}`}>
          <span className="builder-stat-card-label">Treinos</span>
          <span className="builder-stat-card-value">{trainings.length}</span>
          <span className="builder-stat-card-sub">na rotina</span>
        </div>
        <div className="builder-stat-card">
          <span className="builder-stat-card-label">Exercícios</span>
          <span className="builder-stat-card-value">{totalExercises}</span>
          <span className="builder-stat-card-sub">Total</span>
        </div>
        <div className={`builder-stat-card${unassignedTrainings.length > 0 ? ' builder-stat-card--warn' : ''}`}>
          <span className="builder-stat-card-label">Dias atribuídos</span>
          <span className="builder-stat-card-value">
            {assignedDays}
            <span className="builder-stat-card-value-unit">/{trainings.length || '—'}</span>
          </span>
          <span className="builder-stat-card-sub">
            {unassignedTrainings.length > 0 ? `${unassignedTrainings.length} sem dia` : 'todos com dia'}
          </span>
        </div>
        <div className="builder-stat-card">
          <span className="builder-stat-card-label">Duração est.</span>
          <span className="builder-stat-card-value">
            {avgDuration > 0 ? avgDuration : '—'}
            {avgDuration > 0 && <span className="builder-stat-card-value-unit">min</span>}
          </span>
          <span className="builder-stat-card-sub">por treino médio</span>
        </div>
      </div>

      {/* ── Training canvas (scrollable) ── */}
      <div className="training-canvas" role="main">
        {/* Week overview strip */}
        <div>
          <div className="canvas-section-header">
            <span className="canvas-section-title">
              Distribuição semanal
              <span className="canvas-section-title-count">{assignedDays}/7 dias</span>
            </span>
            <span className="canvas-section-hint">O dia é opcional — atribua depois pelo chip no card.</span>
          </div>
          <WeekOverview trainings={trainings} />
        </div>

        {/* Training list */}
        <div>
          <div className="canvas-section-header" style={{ marginTop: 'var(--spacing-xs)' }}>
            <span className="canvas-section-title">
              Treinos da rotina
              <span className="canvas-section-title-count">{trainings.length}</span>
            </span>
            <span className="readiness-legend-inline" aria-label="Legenda de cores">
              <span style={{ textTransform: 'none', fontWeight: 500 }}>Borda:</span>
              <span className="readiness-legend-inline-item">
                <span className="readiness-legend-inline-bar" style={{ background: 'var(--md-outline-variant)' }} aria-hidden="true" />
                Vazio
              </span>
              <span className="readiness-legend-inline-item">
                <span className="readiness-legend-inline-bar" style={{ background: 'var(--brand-accent)' }} aria-hidden="true" />
                Parcial
              </span>
              <span className="readiness-legend-inline-item">
                <span className="readiness-legend-inline-bar" style={{ background: 'var(--md-success)' }} aria-hidden="true" />
                Pronto
              </span>
            </span>
          </div>

          {trainings.length === 0 ? (
            <div className="first-training-hero">
              <div className="first-training-hero-icon">
                <Dumbbell size={28} strokeWidth={2} />
              </div>
              <div className="first-training-hero-title">Comece pelo treino — não pelo dia</div>
              <div className="first-training-hero-description">
                Crie <strong>Treino A, B, C</strong>… adicione exercícios e, quando quiser, atribua dias da semana.
                A distribuição acima mostra a semana em tempo real.
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => { setEditingTraining(null); setSheetOpen(true); }}
                style={{ marginTop: 'var(--spacing-xs)' }}
              >
                <Plus size={16} strokeWidth={2} />Adicionar primeiro treino
              </button>
            </div>
          ) : (
            <div className="training-list">
              {/* Assigned trainings grouped (no header — they appear naturally) */}
              {assignedTrainings.map((t, idx) => (
                <TrainingItem
                  key={t.id}
                  training={t}
                  index={idx}
                  exerciseTemplates={exerciseTemplates}
                  onWeekDayChange={handleWeekDayChange}
                  onDelete={handleDeleteTraining}
                  onEdit={openEditTraining}
                />
              ))}

              {/* Unassigned trainings group */}
              {unassignedTrainings.length > 0 && (
                <>
                  <div className="training-group-header">
                    <span className="training-group-title training-group-title--unassigned">
                      <CalendarOff size={12} strokeWidth={2} />
                      Sem dia atribuído · {unassignedTrainings.length} treino{unassignedTrainings.length > 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--brand-steel)' }}>
                      O dia é opcional — atribua depois.
                    </span>
                  </div>
                  {unassignedTrainings.map((t) => {
                    const globalIdx = trainings.indexOf(t);
                    return (
                      <TrainingItem
                        key={t.id}
                        training={t}
                        index={globalIdx}
                        exerciseTemplates={exerciseTemplates}
                        onWeekDayChange={handleWeekDayChange}
                        onDelete={handleDeleteTraining}
                        onEdit={openEditTraining}
                      />
                    );
                  })}
                </>
              )}

              <button
                type="button"
                className="add-training-cta"
                onClick={() => { setEditingTraining(null); setSheetOpen(true); }}
              >
                <Plus size={16} strokeWidth={2} />Adicionar treino à rotina
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Builder footer (desktop only) ── */}
      <div className="builder-footer table-col-desktop-only">
        <span className="builder-footer-status">
          <span className="builder-footer-status-dot" aria-hidden="true" />
          {lastSaved
            ? `Autosave · ${trainings.length} treino${trainings.length !== 1 ? 's' : ''} · ${totalExercises} exercício${totalExercises !== 1 ? 's' : ''}`
            : 'Autosave ativo'}
        </span>
        {!canSave && (
          <span style={{ fontSize: '11px', color: 'var(--brand-steel)' }}>
            Adicione ao menos 1 treino e um nome para salvar.
          </span>
        )}
      </div>

      {/* ── Bottom bar (mobile) ── */}
      <div className="builder-bottom-bar table-col-mobile-only">
        <button type="button" className="btn-secondary" onClick={handleBack} style={{ flexShrink: 0 }}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{ flex: 1 }}
        >
          <Save size={16} strokeWidth={2} />
          {saving ? 'Salvando…' : 'Salvar rotina'}
        </button>
      </div>

      {/* ── Training sheet ── */}
      {sheetOpen && (
        <TrainingSheet
          routineName={name}
          onClose={() => { setSheetOpen(false); setEditingTraining(null); }}
          onSave={editingTraining ? handleEditTraining : handleSheetSave}
          trainingTemplates={trainingTemplates}
          editingTraining={editingTraining}
        />
      )}

      {/* ── Confirm dialog ── */}
      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolTemplateBuilder;
