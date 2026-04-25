import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Search, Check, Info, Save } from 'lucide-react';
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
  const firstFieldRef = useRef(null);
  const sheetRef = useRef(null);

  // Reset all state when sheet closes or editingTraining changes
  const resetAll = () => {
    setMode('create');
    setForm(EMPTY_FORM);
    setShowMoreFields(false);
    setSearch('');
    setSelectedIds(new Set());
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

  // Escape key and focus on open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first field after paint
    const raf = requestAnimationFrame(() => {
      if (firstFieldRef.current) firstFieldRef.current.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div
      className="overlay add-training-sheet-overlay"
      onClick={handleClose}
      aria-label="Fechar sheet"
    >
      <div
        ref={sheetRef}
        className="bottom-sheet bottom-sheet--large add-training-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle}
      >
        {/* Handle bar (mobile only) */}
        <div className="bottom-sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-title-wrap">
            {eyebrow && (
              <span className="bottom-sheet-eyebrow">{eyebrow}</span>
            )}
            <h2 className="bottom-sheet-title">{sheetTitle}</h2>
          </div>
          <button
            type="button"
            className="bottom-sheet-close"
            aria-label="Fechar"
            onClick={handleClose}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="bottom-sheet-body">
          {/* Segmented toggle — hidden in edit mode */}
          {!isEditMode && (
            <div className="segmented-toggle" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'create'}
                className={`segmented-toggle-btn${mode === 'create' ? ' segmented-toggle-btn--active' : ''}`}
                onClick={() => setMode('create')}
              >
                Criar novo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'library'}
                className={`segmented-toggle-btn${mode === 'library' ? ' segmented-toggle-btn--active' : ''}`}
                onClick={() => setMode('library')}
              >
                Da biblioteca
              </button>
            </div>
          )}

          {/* Tab: Criar novo (always rendered in edit mode) */}
          {(mode === 'create' || isEditMode) && (
            <div className="add-training-create-tab">
              {/* Nome */}
              <div className="form-group">
                <label className="form-label" htmlFor="add-training-name">
                  Nome do treino <span aria-hidden="true">*</span>
                </label>
                <input
                  id="add-training-name"
                  ref={firstFieldRef}
                  className="form-input"
                  placeholder="Ex: Costas & Bíceps"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  autoComplete="off"
                  aria-required="true"
                />
                {!isEditMode && (
                  <span className="form-hint">
                    Será salvo na sua biblioteca de treinos únicos.
                  </span>
                )}
              </div>

              {/* Categoria + Segmento em 2 colunas no desktop */}
              <div className="add-training-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="add-training-category">
                    Categoria <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="add-training-category"
                    className="form-select"
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

                <div className="form-group">
                  <label className="form-label" htmlFor="add-training-segment">
                    Segmento
                  </label>
                  <select
                    id="add-training-segment"
                    className="form-select"
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

              {/* Mostrar mais campos */}
              <button
                type="button"
                className="composer-more-toggle"
                onClick={() => setShowMoreFields((v) => !v)}
                aria-expanded={showMoreFields}
              >
                <span
                  className={`composer-more-toggle-icon${showMoreFields ? ' composer-more-toggle-icon--open' : ''}`}
                  aria-hidden="true"
                />
                {showMoreFields ? 'Menos campos' : 'Mostrar mais campos'}
              </button>

              {/* Campos extras: Descrição */}
              {showMoreFields && (
                <div className="form-group">
                  <label className="form-label" htmlFor="add-training-description">
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="add-training-description"
                    className="form-textarea"
                    placeholder="Objetivo, observações gerais, público-alvo…"
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                  />
                  <span className="form-hint">
                    Aparece no card do treino e ajuda a identificar depois.
                  </span>
                </div>
              )}

              {/* Info banner — only in create mode */}
              {!isEditMode && (
                <div className="info-banner">
                  <Info size={16} strokeWidth={2} className="info-banner-icon" aria-hidden="true" />
                  <span>
                    Os exercícios serão adicionados{' '}
                    <strong>direto no card do treino</strong>, inline. Você não
                    sai desta rotina.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab: Da biblioteca — only in create mode */}
          {!isEditMode && mode === 'library' && (
            <div className="add-training-library-tab">
              {/* Search */}
              <div className="search-input-wrap add-training-search">
                <Search size={16} strokeWidth={2} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Buscar treino na biblioteca…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar treino na biblioteca"
                  ref={firstFieldRef}
                />
              </div>

              {/* Info banner */}
              <div className="info-banner">
                <Info size={16} strokeWidth={2} className="info-banner-icon" aria-hidden="true" />
                <span>
                  Importando: os exercícios do template serão copiados.
                  Alterações aqui não afetam o template original.
                </span>
              </div>

              {/* Template list */}
              {filteredTemplates.length === 0 ? (
                <div className="empty-state-inline">
                  <p>Nenhum treino encontrado.</p>
                </div>
              ) : (
                <div
                  className="template-list"
                  role="listbox"
                  aria-label="Treinos disponíveis"
                  aria-multiselectable="true"
                >
                  {filteredTemplates.map((t) => {
                    const isSelected = selectedIds.has(t.id);
                    const categoryLabel = TRAINING_CATEGORY_LABEL[t.category] || t.category || '';
                    const exerciseCount =
                      t.exerciseTemplates?.length ?? t.exercises?.length ?? 0;
                    const metaParts = [
                      categoryLabel,
                      t.bodySegment
                        ? BODY_SEGMENTS.find((s) => s.value === t.bodySegment)?.label
                        : null,
                      exerciseCount > 0 ? `${exerciseCount} exercícios` : null,
                    ].filter(Boolean);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`template-item${isSelected ? ' template-item--selected' : ''}`}
                        onClick={() => handleToggleTemplate(t.id)}
                      >
                        <div className="template-item-body">
                          <span className="template-item-name">{t.name}</span>
                          {metaParts.length > 0 && (
                            <span className="template-item-meta">
                              {metaParts.join(' · ')}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check
                            size={16}
                            strokeWidth={2}
                            className="template-item-check"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bottom-sheet-footer">
          <div className="btn-group">
            <button
              type="button"
              className="btn-secondary add-training-sheet-btn"
              onClick={handleClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary add-training-sheet-btn"
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
          </div>
        </div>
      </div>
    </div>
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
