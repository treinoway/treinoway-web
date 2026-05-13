import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Check, Search, X } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { t } from '../i18n';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';
import { formatExerciseMeta } from '../utils/exerciseMeta';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * Builds a substitute payload from an exercise template.
 * Note: the resulting substitute will NOT carry an `exerciseTemplateId` link in the DB
 * because the existing POST /trainer/exercises/:id/substitutes endpoint does not accept
 * that field. This is an intentional trade-off (Strategy A). If the template link becomes
 * important, add POST /trainer/exercises/:id/substitutes/from-template on the backend.
 */
const buildPayloadFromTemplate = (template) => {
  const payload = {
    name: template.name,
    type: template.type || '',
    hasLoad: template.hasLoad || false,
    prescriptionMode: template.prescriptionMode || 'reps',
  };
  if (template.sets != null) payload.sets = template.sets;
  if (template.repetitions != null) payload.repetitions = template.repetitions;
  if (template.restInterval != null) payload.restInterval = template.restInterval;
  if (template.hasLoad && template.suggestedLoad != null) {
    payload.suggestedLoad = template.suggestedLoad;
  }
  if (template.videoUrl) payload.videoUrl = template.videoUrl;
  if (template.duration != null) payload.duration = template.duration;
  if (template.notes) payload.notes = template.notes;
  return payload;
};

// ─── LibraryPanel ─────────────────────────────────────────────────────────────

const LibraryPanel = ({ exerciseTemplates, selectedIds, onToggle, search, onSearch }) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exerciseTemplates;
    return exerciseTemplates.filter((tmpl) =>
      (tmpl.name || '').toLowerCase().includes(q)
    );
  }, [exerciseTemplates, search]);

  const emptyMessage = search
    ? t('substitute.libraryNoResults') || 'Nenhum exercício encontrado.'
    : t('substitute.libraryEmpty') || 'Biblioteca vazia.';

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
        <div className="library-empty">{emptyMessage}</div>
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
                      {tmpl.type && (
                        <span className="library-item-cat">{tmpl.type}</span>
                      )}
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

// ─── SubstituteComposerSheet ───────────────────────────────────────────────────

/**
 * Bottom-sheet to add a substitute under an existing principal exercise.
 *
 * Tabs:
 *   "Criar substituto" — same manual form as before, prefilled from principal.
 *   "Da biblioteca"    — multi-select from exerciseTemplates; each selected
 *                        template is POSTed sequentially to
 *                        POST /trainer/exercises/:principalId/substitutes
 *                        with fields derived from the template.
 *
 * On success, calls `onCreated(newSubstitute)` for each created substitute,
 * then closes. Uses `createPortal(document.body)` — do not move this.
 */
const SubstituteComposerSheet = ({
  open,
  principal = null,
  onClose,
  onCreated,
  exerciseTemplates,
}) => {
  const { showToast } = useToast();

  const [tab, setTab] = useState('create');
  const [form, setForm] = useState(() => buildInitialForm(principal));
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // Library tab state
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);

  if (!open) return null;

  const title = t('substitute.composerTitle') || 'Adicionar substituto';

  // ── Tab: Create ─────────────────────────────────────────────────────────────

  const handleField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitCreate = async (e) => {
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

  // ── Tab: Library ─────────────────────────────────────────────────────────────

  const handleToggleTemplate = (id) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleImportFromLibrary = async () => {
    if (selectedTemplateIds.length === 0) return;

    const templates = exerciseTemplates.filter((tmpl) =>
      selectedTemplateIds.includes(tmpl.id)
    );

    setSaving(true);
    try {
      for (const tmpl of templates) {
        const res = await api.post(
          `/trainer/exercises/${principal.id}/substitutes`,
          buildPayloadFromTemplate(tmpl)
        );
        onCreated(res.data);
      }
      const count = templates.length;
      const msg = interpolate(
        t('substitute.importToast') || '{count} substituto(s) adicionado(s).',
        { count }
      );
      showToast(msg, 'success');
      onClose();
    } catch (err) {
      showToast(err.userMessage || 'Erro ao importar substitutos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const importLabel = (() => {
    if (saving) return t('substitute.importAdding') || 'Adicionando…';
    if (selectedTemplateIds.length === 0) return t('substitute.importBtnDefault') || 'Importar';
    return interpolate(
      t('substitute.importBtn') || 'Importar {count}',
      { count: selectedTemplateIds.length }
    );
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return createPortal(
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

        <div className="bottom-sheet-body">
          {/* Segmented toggle */}
          <div
            className="segmented-toggle"
            role="tablist"
            aria-label="Modo de adição de substituto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'create'}
              className={`segmented-toggle-btn${tab === 'create' ? ' segmented-toggle-btn--active' : ''}`}
              onClick={() => setTab('create')}
              disabled={saving}
            >
              {t('substitute.tabCreate') || 'Criar substituto'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'library'}
              className={`segmented-toggle-btn${tab === 'library' ? ' segmented-toggle-btn--active' : ''}`}
              onClick={() => setTab('library')}
              disabled={saving}
            >
              {t('substitute.tabLibrary') || 'Da biblioteca'}
            </button>
          </div>

          {/* Tab: Create */}
          {tab === 'create' && (
            <form className="form" onSubmit={handleSubmitCreate} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="substitute-name">
                  Nome <span aria-hidden="true">*</span>
                </label>
                <input
                  id="substitute-name"
                  className={`form-input${nameError ? ' form-input--error' : ''}`}
                  value={form.name}
                  onChange={(e) => handleField('name', e.target.value)}
                  placeholder={t('substitute.composerNamePlaceholder') || 'Nome do exercício'}
                  required
                  disabled={saving}
                  autoFocus
                />
                {nameError && (
                  <span className="form-error" role="alert">{nameError}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="substitute-type">Tipo</label>
                <select
                  id="substitute-type"
                  className="form-select"
                  value={form.type}
                  onChange={(e) => handleField('type', e.target.value)}
                  disabled={saving}
                >
                  <option value="">—</option>
                  {EXERCISE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                <label className="form-label" htmlFor="substitute-has-load">Carga</label>
              </div>

              {form.hasLoad && (
                <div className="form-group">
                  <label className="form-label" htmlFor="substitute-load">
                    Carga sugerida (kg)
                  </label>
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
                <button type="submit" className="btn-primary" disabled={saving}>
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
          )}

          {/* Tab: Library */}
          {tab === 'library' && (
            <>
              <LibraryPanel
                exerciseTemplates={exerciseTemplates}
                selectedIds={selectedTemplateIds}
                onToggle={handleToggleTemplate}
                search={librarySearch}
                onSearch={setLibrarySearch}
              />
              <div className="btn-group">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleImportFromLibrary}
                  disabled={saving || selectedTemplateIds.length === 0}
                >
                  {importLabel}
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
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
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
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object),
};

SubstituteComposerSheet.defaultProps = {
  principal: null,
  exerciseTemplates: [],
};

export default SubstituteComposerSheet;
