import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Dumbbell, List, Plus, Search } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
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
              'warning'
            );
          } else {
            showToast('Rascunho descartado.', 'success');
          }
        } catch {
          showToast('Erro ao descartar rascunho.', 'error');
        } finally {
          // Best-effort: always clear localStorage even on partial failures
          // so the user is never stuck with a stale draft card.
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
      search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase());
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

  return (
    <div className="routines-page-content">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <span className="page-header-eyebrow page-header-eyebrow--primary">
            Rotinas
          </span>
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

      {/* ── Toolbar ── */}
      <div className="toolbar" role="search">
        <div className="toolbar-search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Buscar rotina por nome ou tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar rotina"
          />
        </div>
        <div className="routines-filter-group" role="tablist" aria-label="Filtrar rotinas">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`routines-filter-btn${activeFilter === f.value ? ' routines-filter-btn--active' : ''}`}
              role="tab"
              aria-selected={activeFilter === f.value}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
              <span className="routines-filter-count">{filterCounts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state (no templates at all AND no local draft) ── */}
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

      {/* ── No results for current filter/search ── */}
      {templates.length > 0 && filteredTemplates.length === 0 && !(activeFilter !== 'ready' && visibleDraft) && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <List size={32} strokeWidth={2} />
          </div>
          <p className="empty-state-title">Nenhuma rotina encontrada</p>
          <p className="text-muted text-sm">Tente ajustar a busca ou o filtro.</p>
        </div>
      )}

      {/* ── Cards grid ── */}
      {(filteredTemplates.length > 0 || (activeFilter !== 'ready' && visibleDraft)) && (
        <div className="grid-cards">
          {/* localStorage draft card — shown in "all" and "draft" filters */}
          {activeFilter !== 'ready' && visibleDraft && (
            <div
              className="card-link card-link--draft"
              role="button"
              tabIndex={0}
              aria-label="Continuar rascunho em andamento"
              onClick={handleContinueDraft}
              onKeyDown={(e) => e.key === 'Enter' && handleContinueDraft()}
            >
              <div className="card-header-row">
                <h3 className="card-subtitle">
                  {visibleDraft.data.name?.trim() || 'Sem nome'}
                </h3>
                <RowMenu
                  ariaLabel="Ações do rascunho"
                  onDelete={handleDiscardDraft}
                  deleteLabel="Descartar"
                  extraItems={[
                    {
                      label: 'Continuar editando',
                      onClick: handleContinueDraft,
                      danger: false,
                    },
                  ]}
                />
              </div>
              <div className="card-badges">
                <span className="badge badge-accent">EM ANDAMENTO</span>
              </div>
              <p className="card-description">
                Salvo {formatRelativeTime(visibleDraft.savedAt)}
              </p>
              <div className="card-stats">
                <span className="stat-chip">
                  <Dumbbell size={14} strokeWidth={2} aria-hidden="true" />
                  {trainingCount} {trainingCount !== 1 ? 'treinos' : 'treino'}
                </span>
              </div>
            </div>
          )}
          {filteredTemplates.map((template) => {
            const levelLabel = LEVEL_LABEL[template.trainingLevel] || null;
            const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
            const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
            // exercisesCount shown only when backend provides it; omit if absent to avoid showing 0 incorrectly
            // TODO: adicionar exercisesCount no backend se necessário
            const exercisesCount = template.exercisesCount ?? null;
            const ready = isReady(template);

            return (
              <div
                key={template.id}
                className="card card-link"
                onClick={() => navigate(`/trainer/routines/${template.id}/edit`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && navigate(`/trainer/routines/${template.id}/edit`)
                }
                aria-label={`Editar rotina ${template.name}`}
              >
                <div className="card-header-row">
                  <h3 className="card-subtitle">{template.name}</h3>
                  <RowMenu
                    ariaLabel={`Ações da rotina ${template.name}`}
                    onEdit={() => navigate(`/trainer/routines/${template.id}/edit`)}
                    onDelete={() => handleDelete(template.id, template.name)}
                  />
                </div>

                <div className="card-badges">
                  {typeLabel && typeLabel !== '-' && (
                    <span className="badge badge-blue">{typeLabel}</span>
                  )}
                  {levelLabel && (
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
                </div>

                {template.description && (
                  <p className="card-description">{template.description}</p>
                )}

                <div className="card-stats">
                  <span className="stat-chip">
                    <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                    {template.defaultDurationWeeks
                      ? `${template.defaultDurationWeeks} semanas`
                      : '–'}
                  </span>
                  <span className="stat-chip">
                    <Dumbbell size={14} strokeWidth={2} aria-hidden="true" />
                    {trainingsCount} {trainingsCount === 1 ? 'treino' : 'treinos'}
                  </span>
                  {exercisesCount !== null && (
                    <span className="stat-chip">
                      <List size={14} strokeWidth={2} aria-hidden="true" />
                      {exercisesCount} exercícios
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirm dialog ── */}
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
