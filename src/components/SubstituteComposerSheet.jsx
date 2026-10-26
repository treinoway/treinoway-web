import { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Check, Loader, Search } from 'lucide-react';
import Modal from './ds/Modal';
import Segmented from './ds/Segmented';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { t } from '../i18n';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';
import { formatExerciseMeta } from '../utils/exerciseMeta';
import useExerciseTemplateSearch from '../hooks/useExerciseTemplateSearch';

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
  if (template.gifUrl) payload.gifUrl = template.gifUrl;
  if (template.duration != null) payload.duration = template.duration;
  if (template.notes) payload.notes = template.notes;
  return payload;
};

// ─── LibraryPanel ─────────────────────────────────────────────────────────────

/**
 * Server-search edition — identical pattern to ExerciseComposer's LibraryPanel.
 * Empty query → shows `initialTemplates` (cached first-100).
 * Non-empty query → fires debounced GET /trainer/exercise-templates?q=…
 * seenMap accumulates all templates ever shown for import resolution.
 */
const LibraryPanel = ({ initialTemplates, selectedIds, onToggle }) => {
  const { results, staleResults, searching, showSpinner, query, setQuery, seenMap } = useExerciseTemplateSearch(initialTemplates);

  const hasQuery = query.trim().length > 0;

  // While a fetch is in flight, keep stale results visible to prevent list flash.
  const displayList = hasQuery
    ? (searching ? (staleResults ?? results ?? []) : (results ?? []))
    : initialTemplates;

  const libraryCount = hasQuery ? seenMap.size : initialTemplates.length;

  const emptyMessage = hasQuery
    ? t('substitute.libraryNoResults') || 'Nenhum exercício encontrado.'
    : t('substitute.libraryEmpty') || 'Biblioteca vazia.';

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
            const meta = formatExerciseMeta(tmpl);
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
                  {meta && (
                    <span className="library-item-meta type-caption">
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

  // Library tab state — search is internal to LibraryPanel (server-search hook)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  // seenMap is forwarded from LibraryPanel.onToggle so import can resolve ids
  // that are no longer visible in the current search results.
  const [seenMapSnapshot, setSeenMapSnapshot] = useState(null);

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

  // seenMap is forwarded by LibraryPanel so we can resolve any selected id
  // even if it is no longer visible in the current search result list.
  const handleToggleTemplate = (id, currentSeenMap) => {
    if (currentSeenMap) setSeenMapSnapshot(currentSeenMap);
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleImportFromLibrary = async () => {
    if (selectedTemplateIds.length === 0) return;

    // Resolve from seenMap first (covers templates found via server search),
    // fall back to the exerciseTemplates prop (initial cached list).
    const resolveTemplate = (id) =>
      (seenMapSnapshot && seenMapSnapshot.get(id)) ||
      exerciseTemplates.find((tmpl) => tmpl.id === id);

    const templates = selectedTemplateIds
      .map(resolveTemplate)
      .filter(Boolean);

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

  const renderNumberField = (id, label, field, extra = {}) => (
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        className="input"
        value={form[field]}
        onChange={(e) => handleField(field, e.target.value)}
        disabled={saving}
        {...extra}
      />
    </div>
  );

  const renderCreateFields = () => (
    <>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="substitute-name">
          Nome <span aria-hidden="true">*</span>
        </label>
        <input
          id="substitute-name"
          className={`input${nameError ? ' input--error' : ''}`}
          value={form.name}
          onChange={(e) => handleField('name', e.target.value)}
          placeholder={t('substitute.composerNamePlaceholder') || 'Nome do exercício'}
          required
          disabled={saving}
          autoFocus
        />
        {nameError && <span className="field-error type-caption" role="alert">{nameError}</span>}
      </div>

      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="substitute-type">Tipo</label>
        <select
          id="substitute-type"
          className="input"
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

      {renderNumberField('substitute-sets', 'Séries', 'sets', { min: '1' })}
      {renderNumberField('substitute-reps-min', 'Reps (mín)', 'repetitionsMin', { min: '1' })}
      {renderNumberField('substitute-reps-max', 'Reps (máx)', 'repetitionsMax', { min: '1' })}

      <div className="substitute-form__load">
        <span className="type-body" id="substitute-load-label">Carga</span>
        <button
          type="button"
          role="switch"
          className="toggle"
          aria-labelledby="substitute-load-label"
          aria-checked={form.hasLoad}
          onClick={() => handleField('hasLoad', !form.hasLoad)}
          disabled={saving}
        />
      </div>

      {form.hasLoad &&
        renderNumberField('substitute-load', 'Carga sugerida (kg)', 'suggestedLoad', { min: '0', step: '0.5' })}

      {renderNumberField('substitute-rest', 'Descanso (s)', 'restInterval', { min: '0' })}
    </>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const handleRequestClose = () => {
    if (!saving) onClose();
  };

  const footer =
    tab === 'create' ? (
      <>
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" form="substitute-create-form" className="btn btn--primary" disabled={saving}>
          {saving ? 'Carregando...' : 'Salvar'}
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleImportFromLibrary}
          disabled={saving || selectedTemplateIds.length === 0}
        >
          {importLabel}
        </button>
      </>
    );

  return createPortal(
    <Modal title={title} onClose={handleRequestClose} closeDisabled={saving} footer={footer}>
      <div className="substitute-sheet">
        <Segmented
          ariaLabel="Modo de adição de substituto"
          items={[
            { id: 'create', label: t('substitute.tabCreate') || 'Criar substituto' },
            { id: 'library', label: t('substitute.tabLibrary') || 'Da biblioteca' },
          ]}
          value={tab}
          onChange={setTab}
          disabled={saving}
        />

        {tab === 'create' && (
          <form id="substitute-create-form" className="substitute-form" onSubmit={handleSubmitCreate} noValidate>
            {renderCreateFields()}
          </form>
        )}

        {tab === 'library' && (
          <LibraryPanel
            initialTemplates={exerciseTemplates}
            selectedIds={selectedTemplateIds}
            onToggle={handleToggleTemplate}
          />
        )}
      </div>
    </Modal>,
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
