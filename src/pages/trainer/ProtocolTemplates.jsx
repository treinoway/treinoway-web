import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Copy, Dumbbell, List, Plus, Search } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';

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

  const readyCount = templates.filter(isReady).length;
  const draftCount = templates.filter((t) => !isReady(t)).length;
  const filterCounts = { all: templates.length, ready: readyCount, draft: draftCount };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando…</span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-title-row">
          <BookOpen size={24} strokeWidth={2} className="page-header-title-icon" />
          <h1>Rotinas</h1>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => showToast('Em breve: duplicar rotina existente.', 'info')}
          >
            <Copy size={16} strokeWidth={2} />
            <span className="table-col-desktop-only">Duplicar existente</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/trainer/protocol-templates/new')}
          >
            <Plus size={16} strokeWidth={2} />Nova rotina
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
              <span style={{ opacity: 0.6, marginLeft: '4px' }}>{filterCounts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state (no templates at all) ── */}
      {templates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <BookOpen size={32} strokeWidth={2} />
          </div>
          <p className="empty-state-title">Sem rotinas ainda</p>
          <p className="text-muted text-sm">
            Crie sua primeira rotina e use-a como base ao montar programas para seus alunos.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/trainer/protocol-templates/new')}
          >
            <Plus size={16} strokeWidth={2} />Criar primeira rotina
          </button>
        </div>
      )}

      {/* ── No results for current filter/search ── */}
      {templates.length > 0 && filteredTemplates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <List size={32} strokeWidth={2} />
          </div>
          <p className="empty-state-title">Nenhuma rotina encontrada</p>
          <p className="text-muted text-sm">Tente ajustar a busca ou o filtro.</p>
        </div>
      )}

      {/* ── Cards grid ── */}
      {filteredTemplates.length > 0 && (
        <div className="grid-cards">
          {filteredTemplates.map((template) => {
            const levelLabel = LEVEL_LABEL[template.trainingLevel] || null;
            const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
            const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
            const exercisesCount = template.exercisesCount ?? 0;
            const ready = isReady(template);

            return (
              <div
                key={template.id}
                className="card card-link"
                onClick={() => navigate(`/trainer/protocol-templates/${template.id}/edit`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === 'Enter' && navigate(`/trainer/protocol-templates/${template.id}/edit`)
                }
                aria-label={`Editar rotina ${template.name}`}
              >
                <div className="card-header-row">
                  <h3 className="card-subtitle">{template.name}</h3>
                  <RowMenu
                    ariaLabel={`Ações da rotina ${template.name}`}
                    onEdit={() => navigate(`/trainer/protocol-templates/${template.id}/edit`)}
                    onDelete={() => handleDelete(template.id, template.name)}
                  />
                </div>

                <div className="card-badges">
                  {typeLabel && <span className="badge badge-blue">{typeLabel}</span>}
                  {levelLabel && <span className="badge badge-gray">{levelLabel}</span>}
                  {ready ? (
                    <span className="badge badge-green">
                      <span className="badge-dot" aria-hidden="true" />Pronta
                    </span>
                  ) : (
                    <span className="badge badge-accent">Rascunho</span>
                  )}
                </div>

                {template.description && (
                  <p className="card-description text-clamp-2">{template.description}</p>
                )}

                <div className="card-stats">
                  <span className="stat-chip">
                    <Calendar size={12} strokeWidth={2} />
                    {template.defaultDurationWeeks
                      ? `${template.defaultDurationWeeks} semanas`
                      : '–'}
                  </span>
                  <span className="stat-chip">
                    <Dumbbell size={12} strokeWidth={2} />
                    {trainingsCount} {trainingsCount === 1 ? 'treino' : 'treinos'}
                  </span>
                  {exercisesCount > 0 && (
                    <span className="stat-chip">
                      <List size={12} strokeWidth={2} />
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

export default ProtocolTemplates;
