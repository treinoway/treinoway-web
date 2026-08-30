import { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Check, Loader, Search, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { t, translateError } from '../i18n';
import { getExerciseTypeLabel } from '../constants/exerciseTypes';
import useExerciseTemplateSearch from '../hooks/useExerciseTemplateSearch';

const LibrarySingleSelectList = ({ initialTemplates, selectedId, onSelect }) => {
  const { results, staleResults, searching, showSpinner, query, setQuery, seenMap } =
    useExerciseTemplateSearch(initialTemplates);

  const hasQuery = query.trim().length > 0;
  const displayList = hasQuery
    ? (searching ? (staleResults ?? results ?? []) : (results ?? []))
    : initialTemplates;

  const emptyMessage = hasQuery
    ? t('replace.libraryNoResults') || 'Nenhum exercício encontrado.'
    : t('replace.libraryEmpty') || 'Biblioteca vazia.';

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
            const selected = selectedId === tmpl.id;
            const typeLabel = tmpl.type ? getExerciseTypeLabel(tmpl.type) : null;
            return (
              <button
                key={tmpl.id}
                type="button"
                role="listitem"
                className={`library-item${selected ? ' library-item--selected' : ''}`}
                onClick={() => onSelect(tmpl.id, seenMap)}
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
    </div>
  );
};

LibrarySingleSelectList.propTypes = {
  initialTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

LibrarySingleSelectList.defaultProps = {
  selectedId: null,
};

const ReplaceExerciseSheet = ({
  open,
  exercise,
  exerciseTemplates,
  onClose,
  onReplace,
  onReplaced,
}) => {
  const { showToast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const title = t('replace.title') || 'Substituir exercício';
  const exerciseName = exercise?.name || exercise?.exerciseTemplate?.name || 'exercício';

  const handleSelect = (id, seenMap) => {
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplateId(id);
    setSelectedTemplate(seenMap?.get(id) || exerciseTemplates.find((tmpl) => tmpl.id === id) || null);
  };

  const handleConfirm = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);
    try {
      await onReplace(selectedTemplateId, selectedTemplate);
      showToast(t('replace.successToast') || 'Exercício substituído.', 'success');
      onReplaced();
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-sm text-muted mb-md">
            Substituindo <strong>{exerciseName}</strong>. Séries, reps, carga, descanso e
            observações são mantidos.
          </p>

          <LibrarySingleSelectList
            initialTemplates={exerciseTemplates}
            selectedId={selectedTemplateId}
            onSelect={handleSelect}
          />

          <div className="btn-group">
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirm}
              disabled={saving || !selectedTemplateId}
            >
              {saving ? 'Carregando...' : 'Substituir'}
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
        </div>
      </div>
    </div>,
    document.body
  );
};

ReplaceExerciseSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  exercise: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    exerciseTemplate: PropTypes.shape({ name: PropTypes.string }),
  }),
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object),
  onClose: PropTypes.func.isRequired,
  onReplace: PropTypes.func.isRequired,
  onReplaced: PropTypes.func.isRequired,
};

ReplaceExerciseSheet.defaultProps = {
  exercise: null,
  exerciseTemplates: [],
};

export default ReplaceExerciseSheet;
