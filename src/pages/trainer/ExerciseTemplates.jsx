import { useState, useEffect, useCallback, useRef } from 'react';
import { Dumbbell, Info, Layers, Loader } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import useDelayedFlag from '../../hooks/useDelayedFlag';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import LibraryBatchBar from '../../components/LibraryBatchBar';
import ExerciseTemplateForm from '../../components/ExerciseTemplateForm';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const ALL_FILTER = 'all';

const TYPE_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...EXERCISE_TYPE_OPTIONS,
];

const ExerciseTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formName, setFormName] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const debounceRef = useRef(null);
  // True only until the very first fetch resolves. After that, refetches (search,
  // filter, pagination) use an inline loading indicator so the filter bar / list
  // stay mounted and the search input never loses focus.
  const hasLoadedOnceRef = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  // Delayed flag: only show the refetch indicator after 250 ms so fast fetches
  // never flash a spinner on screen.
  const showRefetchIndicator = useDelayedFlag(refetching, 250);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchTemplates = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    } else {
      setRefetching(true);
    }
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (q) params.q = q;
      if (type) params.type = type;
      const response = await api.get('/trainer/exercise-templates', { params });
      setTemplates(response.data.data);
      setTotal(response.data.total);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setInitialLoading(false);
      setRefetching(false);
    }
  }, [page, q, type, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Selection is per-page: drop it whenever the page/query/filter changes.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, q, type]);

  const handleFilterChange = (value) => {
    setType(value === ALL_FILTER ? '' : value);
    setPage(1);
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setFormName(template.name || '');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Excluir este exercício? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/exercise-templates/${id}`);
          showToast('Exercício excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const pageIds = templates.map((t) => t.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...pageIds]);
  };

  const handleBatchDelete = () => {
    const count = selectedIds.length;
    setConfirmDialog({
      message: `Excluir ${count} ${count === 1 ? 'item' : 'itens'} selecionado${count === 1 ? '' : 's'}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await api.post('/trainer/exercise-templates/batch-delete', {
            ids: selectedIds,
          });
          showToast(`${res.data.deletedCount} itens excluídos.`, 'success');
          setSelectedIds([]);
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormName('');
  };

  const hasActiveFilters = !!q || !!type;
  const isEmptyLibrary = total === 0 && !hasActiveFilters && !initialLoading;
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  // The filter bar and list stay mounted across refetches so the search input
  // never unmounts mid-keystroke. Only hide during initial load or form mode.
  const showFilterBar = !showForm && !initialLoading && !isEmptyLibrary;
  const showList = !showForm && !initialLoading && !isEmptyLibrary;
  const activeFilterValue = type || ALL_FILTER;

  return (
    <div>
      {!showForm && (
        <div className="page-header">
          <div className="page-header-title-row">
            <Dumbbell size={24} strokeWidth={2} className="page-header-title-icon" />
            <h1>Exercícios</h1>
          </div>
          <div className="page-header-actions">
            {!isEmptyLibrary && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                + Novo exercício
              </button>
            )}
          </div>
        </div>
      )}

      {showFilterBar && (
        <LibraryFilterBar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Buscar exercício por nome…"
          searchAriaLabel="Buscar exercícios"
          filters={TYPE_FILTERS}
          activeFilter={activeFilterValue}
          onFilterChange={handleFilterChange}
        />
      )}

      {showForm && (
        <div className="etf-form-screen">
          <div className="etf-form-wrapper">
            <div className="etf-page-header">
              <span className="etf-page-header-eyebrow">
                <Layers size={12} strokeWidth={2} aria-hidden="true" />
                Modelo · Biblioteca
              </span>
              <h1 className={formName.trim() ? undefined : 'is-empty'}>
                {formName.trim() || 'Sem nome ainda'}
              </h1>
              <span className="etf-page-header-sub">
                Disponível em qualquer treino que você prescrever.
              </span>
            </div>
            <ExerciseTemplateForm
              exerciseTemplate={editingId ? templates.find((t) => t.id === editingId) : null}
              onSuccess={() => { fetchTemplates(); resetForm(); }}
              onCancel={resetForm}
              onNameChange={setFormName}
            />
          </div>
        </div>
      )}

      {initialLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {showList && (
        <>
          {showRefetchIndicator && (
            <div className="library-refetch-indicator" aria-live="polite" aria-label="Atualizando lista…">
              <Loader size={14} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
              <span>Buscando…</span>
            </div>
          )}

          <LibraryBatchBar
            allSelected={allSelected}
            selectedCount={selectedIds.length}
            onToggleSelectAll={handleToggleSelectAll}
            onDelete={handleBatchDelete}
          />

          <LibraryList
            emptyMessage={`Nenhum resultado para "${q}"`}
            isNoResults={hasActiveFilters}
          >
            {templates.map((template) => {
              const hasVideo = !!getYoutubeVideoId(template.videoUrl);
              const typeLabel = template.type ? getExerciseTypeLabel(template.type) : null;

              const badges = (
                <>
                  {typeLabel && <span className="badge badge-blue">{typeLabel}</span>}
                  {template.isPublic && <span className="badge badge-green">Público</span>}
                  {hasVideo && <span className="badge badge-gray">Vídeo</span>}
                </>
              );

              return (
                <LibraryListRow
                  key={template.id}
                  title={template.name}
                  badges={badges}
                  selectable
                  selected={selectedIds.includes(template.id)}
                  onToggleSelect={() => toggleSelect(template.id)}
                  selectAriaLabel={`Selecionar ${template.name}`}
                  rowMenuProps={{
                    ariaLabel: `Ações do modelo ${template.name}`,
                    onEdit: () => handleEdit(template),
                    onDelete: () => handleDelete(template.id),
                  }}
                />
              );
            })}
          </LibraryList>

          {totalPages > 1 && (
            <div className="pagination-row">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="text-sm text-muted">
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {!showForm && !initialLoading && isEmptyLibrary && (
        <>
          <div className="info-banner">
            <span className="info-banner-icon"><Info size={16} strokeWidth={1.6} /></span>
            <span><strong>O que é um exercício?</strong> Um exercício é um movimento reutilizável que pode ser adicionado aos seus treinos. Defina séries, repetições, carga sugerida e até link de vídeo para facilitar a montagem das rotinas.</span>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon empty-state-icon--accent">
              <Dumbbell size={32} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum exercício ainda</p>
            <p>Crie seu primeiro exercício e use-o como base ao montar treinos para seus alunos.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Criar primeiro exercício
            </button>
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger">
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseTemplates;
