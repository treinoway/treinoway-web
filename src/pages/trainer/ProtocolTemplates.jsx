import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Dumbbell, Plus, Search } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';
import { getRoutineDraft, clearRoutineDraft, cleanupDraftResources } from '../../utils/routineDraft';
import formatRelativeTime from '../../utils/relativeTime';

const LEVEL_LABEL = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  athlete: 'Atleta',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'ready', label: 'Prontas' },
  { value: 'draft', label: 'Rascunho' },
];

const isReady = (template) => {
  const count = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
  return count > 0;
};

const ProtocolTemplates = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [draft, setDraft] = useState(() => getRoutineDraft());

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      search === '' || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'ready' && isReady(t)) ||
      (activeFilter === 'draft' && !isReady(t));
    return matchesSearch && matchesFilter;
  });

  const hasLocalDraft = !!visibleDraft;
  const localDraftCount = hasLocalDraft ? 1 : 0;
  const readyCount = templates.filter(isReady).length;
  const draftCount = templates.filter((t) => !isReady(t)).length;
  const filterCounts = {
    all: templates.length + localDraftCount,
    ready: readyCount,
    draft: draftCount + localDraftCount,
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando…</span>
      </div>
    );
  }

  const showDraftRow = activeFilter !== 'ready' && visibleDraft;
  const hasRows = filteredTemplates.length > 0 || showDraftRow;

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

      {(templates.length > 0 || visibleDraft) && (
        <LibraryFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar rotina por nome ou tipo…"
          searchAriaLabel="Buscar rotina"
          filters={FILTER_OPTIONS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          filterCounts={filterCounts}
        />
      )}

      {templates.length === 0 && !visibleDraft && (
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

      {(templates.length > 0 || visibleDraft) && (
        <LibraryList emptyMessage="Nenhuma rotina encontrada">
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

          {filteredTemplates.map((template) => {
            const levelLabel = LEVEL_LABEL[template.trainingLevel] || null;
            const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
            const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
            const ready = isReady(template);

            const badges = (
              <>
                {typeLabel && typeLabel !== '-' && (
                  <span className="badge badge-blue">{typeLabel}</span>
                )}
                {levelLabel && <span className="badge badge-gray">{levelLabel}</span>}
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

          {!hasRows && search && (
            <LibraryListRow
              key="no-results"
              title={`Nenhuma rotina encontrada para "${search}"`}
              ariaLabel="Sem resultados"
            />
          )}
        </LibraryList>
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
