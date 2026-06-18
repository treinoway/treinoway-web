import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Dumbbell, Plus } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import LibraryBatchBar from '../../components/LibraryBatchBar';
import Select from '../../components/Select';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { TRAINING_LEVEL_OPTIONS, getLevelLabel } from '../../constants/trainingLevels';
import { getRoutineDraft, clearRoutineDraft, cleanupDraftResources } from '../../utils/routineDraft';
import formatRelativeTime from '../../utils/relativeTime';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const ALL_FILTER = 'all';

const TYPE_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...PROTOCOL_TYPE_OPTIONS,
];

const isReady = (template) => {
  const count = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
  return count > 0;
};

const ProtocolTemplates = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [draft, setDraft] = useState(() => getRoutineDraft());

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [trainingLevel, setTrainingLevel] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (q) params.q = q;
      if (type) params.type = type;
      if (trainingLevel) params.trainingLevel = trainingLevel;
      const response = await api.get('/trainer/protocol-templates', { params });
      setTemplates(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, q, type, trainingLevel, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Selection is per-page: drop it whenever the page/query/filters change.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, q, type, trainingLevel]);

  const handleTypeFilterChange = (value) => {
    setType(value === ALL_FILTER ? '' : value);
    setPage(1);
  };

  const handleTrainingLevelChange = (value) => {
    setTrainingLevel(value);
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBatchDelete = () => {
    const count = selectedIds.length;
    setConfirmDialog({
      message: `Excluir ${count} ${count === 1 ? 'item' : 'itens'} selecionado${count === 1 ? '' : 's'}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await api.post('/trainer/protocol-templates/batch-delete', {
            ids: selectedIds,
          });
          showToast(`${res.data.deletedCount} itens excluídos.`, 'success');
          setSelectedIds([]);
          await fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleDelete = (id, name) => {
    setConfirmDialog({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocol-templates/${id}`);
          showToast('Rotina excluída.', 'success');
          await fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleContinueDraft = () => navigate('/trainer/routines/new');

  const handleDiscardDraft = (e) => {
    e?.stopPropagation?.();
    setConfirmDialog({
      message: 'Descartar este rascunho? Os treinos e exercícios criados aqui também serão apagados.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const result = await cleanupDraftResources(draft);
          if (result.failureCount > 0) {
            showToast(
              `Rascunho descartado, mas ${result.failureCount} item(ns) não puderam ser apagados.`,
              'warning',
            );
          } else {
            showToast('Rascunho descartado.', 'success');
          }
        } catch {
          showToast('Erro ao descartar rascunho.', 'error');
        } finally {
          clearRoutineDraft();
          setDraft(null);
        }
      },
    });
  };

  const trainingCount = draft?.data?.trainingIds?.length ?? 0;

  const isEmptyDraft =
    draft &&
    !draft.data.name?.trim() &&
    !draft.data.trainingIds?.length &&
    !(draft.data.meta && Object.values(draft.data.meta).some((v) => v != null && v !== ''));

  const visibleDraft = draft && !isEmptyDraft ? draft : null;

  const hasActiveFilters = !!q || !!type || !!trainingLevel;
  const isEmptyLibrary = total === 0 && !visibleDraft && !hasActiveFilters;
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const activeTypeValue = type || ALL_FILTER;

  const pageIds = templates.map((t) => t.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...pageIds]);
  };

  const trainingLevelSelect = (
    <Select
      value={trainingLevel}
      onChange={(e) => handleTrainingLevelChange(e.target.value)}
      aria-label="Filtrar por nível"
    >
      <option value="">Todos os níveis</option>
      {TRAINING_LEVEL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando…</span>
      </div>
    );
  }

  // Local draft only shows on the first page with no active filters — it is a
  // client-only row and cannot be paginated/filtered server-side.
  const showDraftRow = !!visibleDraft && page === 1 && !hasActiveFilters;
  const showList = !isEmptyLibrary;

  return (
    <div className="routines-page-content">
      <div className="page-header">
        <div>
          <span className="page-header-eyebrow page-header-eyebrow--primary">Rotinas</span>
          <div className="page-header-title-row">
            <BookOpen size={24} strokeWidth={2} className="page-header-title-icon" />
            <h1>Rotinas</h1>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/trainer/routines/new')}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Nova rotina
          </button>
        </div>
      </div>

      {showList && (
        <LibraryFilterBar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Buscar rotina por nome ou tipo…"
          searchAriaLabel="Buscar rotina"
          filters={TYPE_FILTERS}
          activeFilter={activeTypeValue}
          onFilterChange={handleTypeFilterChange}
          sortSelect={trainingLevelSelect}
        />
      )}

      {isEmptyLibrary && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Dumbbell size={32} strokeWidth={2} />
          </div>
          <h2 className="empty-state-title">Comece pelo treino — não pelo dia</h2>
          <p className="text-muted text-sm">
            Crie Treino A, B, C… O dia da semana é opcional — você atribui depois.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/trainer/routines/new')}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Adicionar primeira rotina
          </button>
        </div>
      )}

      {showList && (
        <>
          <LibraryBatchBar
            allSelected={allSelected}
            selectedCount={selectedIds.length}
            onToggleSelectAll={handleToggleSelectAll}
            onDelete={handleBatchDelete}
          />

          <LibraryList
            emptyMessage="Nenhuma rotina encontrada"
            isNoResults={hasActiveFilters}
          >
            {showDraftRow && (
              <LibraryListRow
                key="local-draft"
                title={visibleDraft.data.name?.trim() || 'Sem nome'}
                subtitle={`Rascunho salvo ${formatRelativeTime(visibleDraft.savedAt)}`}
                badges={<span className="badge badge-accent">EM ANDAMENTO</span>}
                stats={
                  <span className="stat-chip">
                    <Dumbbell size={14} strokeWidth={2} aria-hidden="true" />
                    {trainingCount} {trainingCount !== 1 ? 'treinos' : 'treino'}
                  </span>
                }
                onClick={handleContinueDraft}
                ariaLabel="Continuar rascunho em andamento"
                rowMenuProps={{
                  ariaLabel: 'Ações do rascunho',
                  onDelete: handleDiscardDraft,
                  deleteLabel: 'Descartar',
                  extraItems: [
                    {
                      label: 'Continuar editando',
                      onClick: handleContinueDraft,
                      danger: false,
                    },
                  ],
                }}
              />
            )}

            {templates.map((template) => {
              const levelLabel = template.trainingLevel ? getLevelLabel(template.trainingLevel) : null;
              const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
              const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
              const ready = isReady(template);

              const badges = (
                <>
                  {typeLabel && typeLabel !== '-' && (
                    <span className="badge badge-blue">{typeLabel}</span>
                  )}
                  {levelLabel && levelLabel !== '-' && (
                    <span className="badge badge-gray">{levelLabel}</span>
                  )}
                  {ready ? (
                    <span className="badge badge-green">
                      <span className="badge-dot" aria-hidden="true" />
                      Pronta
                    </span>
                  ) : (
                    <span className="badge badge-accent">Rascunho</span>
                  )}
                </>
              );

              const subtitle = [
                template.defaultDurationWeeks
                  ? `${template.defaultDurationWeeks} sem.`
                  : null,
                `${trainingsCount} ${trainingsCount === 1 ? 'treino' : 'treinos'}`,
              ]
                .filter(Boolean)
                .join(' · ');

              const stats = (
                <>
                  {template.defaultDurationWeeks && (
                    <span className="stat-chip">
                      <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                      {template.defaultDurationWeeks} semanas
                    </span>
                  )}
                  <span className="stat-chip">
                    <Dumbbell size={14} strokeWidth={2} aria-hidden="true" />
                    {trainingsCount} {trainingsCount === 1 ? 'treino' : 'treinos'}
                  </span>
                </>
              );

              return (
                <LibraryListRow
                  key={template.id}
                  title={template.name}
                  subtitle={subtitle}
                  badges={badges}
                  stats={stats}
                  selectable
                  selected={selectedIds.includes(template.id)}
                  onToggleSelect={() => toggleSelect(template.id)}
                  selectAriaLabel={`Selecionar ${template.name}`}
                  onClick={() => navigate(`/trainer/routines/${template.id}/edit`)}
                  ariaLabel={`Editar rotina ${template.name}`}
                  rowMenuProps={{
                    ariaLabel: `Ações da rotina ${template.name}`,
                    onEdit: () => navigate(`/trainer/routines/${template.id}/edit`),
                    onDelete: () => handleDelete(template.id, template.name),
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

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
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

export default ProtocolTemplates;
