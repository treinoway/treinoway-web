import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Plus, Search, Check, Info, Save, ChevronDown } from 'lucide-react';
import Modal from './ds/Modal';
import Segmented from './ds/Segmented';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../constants/trainingCategories';

// ─── Constants ────────────────────────────────────────────────────────────────

const BODY_SEGMENTS = [
  { value: '', label: '— Selecionar —' },
  { value: 'upper', label: 'Superior' },
  { value: 'lower', label: 'Inferior' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Corpo inteiro' },
];

const EMPTY_FORM = {
  name: '',
  category: '',
  bodySegment: '',
  description: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFormFromSnapshot = (training) => ({
  name: training.name || '',
  category: training.category || '',
  bodySegment: training.bodySegment || '',
  description: training.description || '',
});

// Extracts exercise junction rows from a training template payload,
// supporting the preferred field (trainingTemplateExerciseTemplates)
// and legacy fallbacks. Mirrors src/hooks/useRoutineBuilder.js#extractExercises.
const extractTemplateExercises = (template) => {
  if (!template) return [];
  return (
    template.trainingTemplateExerciseTemplates ||
    template.exerciseTemplates ||
    template.exercises ||
    []
  );
};

const sortByOrder = (exercises) =>
  [...exercises].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

// Builds the "4 × 8–12" / "3 × 30s" / "3 séries" segment of the preview line.
const buildPrescriptionLabel = (exercise) => {
  const sets = exercise?.sets ?? 0;

  if (exercise?.prescriptionMode === 'duration' && exercise?.duration > 0) {
    return `${sets} × ${exercise.duration}s`;
  }

  const reps = exercise?.repetitions;
  if (reps && typeof reps === 'object') {
    const { min, max } = reps;
    if (min != null && max != null) {
      if (min === max) return `${sets} × ${min}`;
      return `${sets} × ${min}–${max}`;
    }
  }

  return `${sets} séries`;
};

const formatExercisePreviewLine = (exercise, index) => {
  const order = index + 1;
  const name = exercise?.name || 'Exercício';
  const prescription = buildPrescriptionLabel(exercise);
  const restPart =
    exercise?.restInterval > 0 ? ` · ${exercise.restInterval}s descanso` : '';
  return `${order}. ${name} · ${prescription}${restPart}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const AddTrainingSheet = ({
  open,
  onClose,
  onCreate,
  onUpdate,
  onImport,
  trainingTemplates,
  existingTrainingIds,
  eyebrow,
  saving,
  editingTraining,
}) => {
  const isEditMode = !!editingTraining;

  const [mode, setMode] = useState('create');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const firstFieldRef = useRef(null);

  // Reset all state when sheet closes or editingTraining changes
  const resetAll = () => {
    setMode('create');
    setForm(EMPTY_FORM);
    setShowMoreFields(false);
    setSearch('');
    setSelectedIds(new Set());
    setExpandedIds(new Set());
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // When opening in edit mode, pre-populate form from snapshot
  useEffect(() => {
    if (open && isEditMode) {
      setMode('create');
      const populated = buildFormFromSnapshot(editingTraining);
      setForm(populated);
      // Auto-expand more fields if description is present
      setShowMoreFields(!!populated.description);
    }
    if (!open) {
      resetAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTraining]);

  // Focus the first field on open (Escape / focus trap come from <Modal>)
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      if (firstFieldRef.current) firstFieldRef.current.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  // ── Form field change ────────────────────────────────────────────────────

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Template selection ───────────────────────────────────────────────────

  const handleToggleTemplate = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Keyboard activation for the row (since it's a div with role=option).
  const handleRowKeyDown = (e, id) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggleTemplate(id);
    }
  };

  // ── Submit logic ─────────────────────────────────────────────────────────

  const canSubmit =
    mode === 'create'
      ? form.name.trim().length > 0 && form.category !== ''
      : selectedIds.size > 0;

  const buildPayload = () => ({
    name: form.name.trim(),
    category: form.category,
    ...(form.bodySegment && { bodySegment: form.bodySegment }),
    ...(form.description.trim() && { description: form.description.trim() }),
  });

  const handleSubmit = async () => {
    try {
      if (isEditMode) {
        const payload = buildPayload();
        await onUpdate(editingTraining.id, payload);
        handleClose();
        return;
      }
      if (mode === 'create') {
        const created = await onCreate(buildPayload());
        handleClose();
        return created;
      }
      if (mode === 'library') {
        const imported = await onImport(Array.from(selectedIds));
        handleClose();
        return imported;
      }
    } catch {
      // Error toast is handled by the hook; keep sheet open on error
    }
  };

  // ── Filtered templates ───────────────────────────────────────────────────

  const filteredTemplates = trainingTemplates.filter((t) => {
    if (existingTrainingIds && existingTrainingIds.has(t.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(q);
    const categoryMatch = (TRAINING_CATEGORY_LABEL[t.category] || t.category || '')
      .toLowerCase()
      .includes(q);
    return nameMatch || categoryMatch;
  });

  // ── Labels ───────────────────────────────────────────────────────────────

  const sheetTitle = isEditMode ? 'Editar treino' : 'Adicionar treino';

  const submitLabel = saving
    ? isEditMode
      ? 'Salvando…'
      : 'Adicionando…'
    : isEditMode
    ? 'Salvar alterações'
    : mode === 'create'
    ? 'Adicionar e abrir'
    : 'Adicionar treino';

  // ── Render ───────────────────────────────────────────────────────────────

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={saving}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={saving || !canSubmit}
      >
        {isEditMode ? (
          <Save size={16} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
        )}
        {submitLabel}
      </button>
    </>
  );

  return (
    <Modal title={sheetTitle} eyebrow={eyebrow || undefined} onClose={handleClose} footer={footer}>
      <div className="add-training-sheet">
        {!isEditMode && (
          <Segmented
            ariaLabel="Modo de adição de treino"
            items={[
              { id: 'create', label: 'Criar novo' },
              { id: 'library', label: 'Da biblioteca' },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}

        {(mode === 'create' || isEditMode) && (
          <div className="add-training-create-tab">
            <div className="field">
              <label className="field-label type-caption-strong" htmlFor="add-training-name">
                Nome do treino <span aria-hidden="true">*</span>
              </label>
              <input
                id="add-training-name"
                ref={firstFieldRef}
                className="input"
                placeholder="Ex: Costas & Bíceps"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                autoComplete="off"
                aria-required="true"
              />
              {!isEditMode && (
                <span className="field-hint type-caption">
                  Será salvo na sua biblioteca de treinos únicos.
                </span>
              )}
            </div>

            <div className="add-training-grid">
              <div className="field">
                <label className="field-label type-caption-strong" htmlFor="add-training-category">
                  Categoria <span aria-hidden="true">*</span>
                </label>
                <select
                  id="add-training-category"
                  className="input"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  aria-required="true"
                >
                  <option value="">— Selecionar —</option>
                  {TRAINING_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label type-caption-strong" htmlFor="add-training-segment">
                  Segmento
                </label>
                <select
                  id="add-training-segment"
                  className="input"
                  value={form.bodySegment}
                  onChange={(e) => updateField('bodySegment', e.target.value)}
                >
                  {BODY_SEGMENTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--ghost add-training-more-toggle"
              onClick={() => setShowMoreFields((v) => !v)}
              aria-expanded={showMoreFields}
            >
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`add-training-more-icon${showMoreFields ? ' add-training-more-icon--open' : ''}`}
                aria-hidden="true"
              />
              {showMoreFields ? 'Menos campos' : 'Mostrar mais campos'}
            </button>

            {showMoreFields && (
              <div className="field">
                <label className="field-label type-caption-strong" htmlFor="add-training-description">
                  Descrição (opcional)
                </label>
                <textarea
                  id="add-training-description"
                  className="input"
                  placeholder="Objetivo, observações gerais, público-alvo…"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
                <span className="field-hint type-caption">
                  Aparece no card do treino e ajuda a identificar depois.
                </span>
              </div>
            )}

            {!isEditMode && (
              <div className="ds-banner">
                <span className="ds-banner__icon" aria-hidden="true">
                  <Info size={20} strokeWidth={2} />
                </span>
                <span className="ds-banner__text type-body">
                  <span>
                    Os exercícios serão adicionados <strong>direto no card do treino</strong>, inline. Você não
                    sai desta rotina.
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {!isEditMode && mode === 'library' && (
          <div className="add-training-library-tab">
            <div className="input--search-wrap">
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              <input
                type="text"
                className="input input--search"
                placeholder="Buscar treino na biblioteca…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar treino na biblioteca"
                ref={firstFieldRef}
              />
            </div>

            <div className="ds-banner">
              <span className="ds-banner__icon" aria-hidden="true">
                <Info size={20} strokeWidth={2} />
              </span>
              <span className="ds-banner__text type-body">
                <span>
                  Importando: os exercícios do template serão copiados. Alterações aqui não afetam o template
                  original.
                </span>
              </span>
            </div>

            {filteredTemplates.length === 0 ? (
              <p className="empty-state-inline type-body">Nenhum treino encontrado.</p>
            ) : (
              <div
                className="template-list"
                role="listbox"
                aria-label="Treinos disponíveis"
                aria-multiselectable="true"
              >
                {filteredTemplates.map((t) => {
                  const isSelected = selectedIds.has(t.id);
                  const isExpanded = expandedIds.has(t.id);
                  const categoryLabel = TRAINING_CATEGORY_LABEL[t.category] || t.category || '';
                  const exercises = extractTemplateExercises(t);
                  const exerciseCount = exercises.length;
                  const metaParts = [
                    categoryLabel,
                    t.bodySegment ? BODY_SEGMENTS.find((s) => s.value === t.bodySegment)?.label : null,
                    exerciseCount > 0 ? `${exerciseCount} exercícios` : null,
                  ].filter(Boolean);
                  const sortedExercises = sortByOrder(exercises);
                  const disclosureLabel = isExpanded ? 'Ocultar exercícios' : 'Ver exercícios';

                  return (
                    <div key={t.id} className="template-item-wrap">
                      <div
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        className={`template-item${isSelected ? ' template-item--selected' : ''}`}
                        onClick={() => handleToggleTemplate(t.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, t.id)}
                      >
                        <div className="template-item-body">
                          <span className="template-item-name type-body-strong">{t.name}</span>
                          {metaParts.length > 0 && (
                            <span className="template-item-meta type-caption">{metaParts.join(' · ')}</span>
                          )}
                        </div>
                        {isSelected && (
                          <Check size={16} strokeWidth={2} className="template-item-check" aria-hidden="true" />
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          aria-expanded={isExpanded}
                          aria-label={disclosureLabel}
                          title={disclosureLabel}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpanded(t.id);
                          }}
                        >
                          <ChevronDown
                            size={20}
                            strokeWidth={2}
                            className={`add-training-more-icon${isExpanded ? ' add-training-more-icon--open' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="template-preview">
                          {sortedExercises.length === 0 ? (
                            <span className="template-preview-empty type-caption">
                              Nenhum exercício neste treino
                            </span>
                          ) : (
                            sortedExercises.map((ex, idx) => (
                              <span
                                key={ex.id ?? `${t.id}-${idx}`}
                                className="template-preview-exercise type-caption"
                              >
                                {formatExercisePreviewLine(ex, idx)}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

AddTrainingSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  trainingTemplates: PropTypes.array.isRequired,
  existingTrainingIds: PropTypes.instanceOf(Set),
  eyebrow: PropTypes.string,
  saving: PropTypes.bool,
  editingTraining: PropTypes.object,
};

AddTrainingSheet.defaultProps = {
  onUpdate: null,
  existingTrainingIds: null,
  eyebrow: null,
  saving: false,
  editingTraining: null,
};

export default AddTrainingSheet;
