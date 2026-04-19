import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, BookOpen, Info, Calendar, Dumbbell } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';

const ProtocolTemplates = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.protocolTemplates);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    setConfirmDialog({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocol-templates/${id}`);
          showToast('Rotina excluída com sucesso!', 'success');
          await fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  return (
    <div>
      {templatesLoading && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!templatesLoading && (
        <>
          <div className="page-header">
            <div className="page-header-title-row">
              <BookOpen size={24} className="page-header-title-icon" />
              <h1>Rotinas</h1>
            </div>
            <div className="page-header-actions">
              <div className="view-toggle-group">
                <button
                  type="button"
                  className={`view-toggle-btn${viewMode === 'card' ? ' view-toggle-btn--active' : ''}`}
                  onClick={() => setViewMode('card')}
                  aria-pressed={viewMode === 'card'}
                  aria-label="Visualização em cards"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="Visualização em lista"
                >
                  <List size={16} />
                </button>
              </div>
              {templates.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/trainer/protocol-templates/new')}
                >
                  + Nova rotina
                </button>
              )}
            </div>
          </div>

          {templates.length === 0 && (
            <>
              <div className="info-banner">
                <span className="info-banner-icon"><Info size={16} strokeWidth={1.6} /></span>
                <span><strong>O que é um modelo?</strong> Um modelo é uma estrutura de rotina pré-definida com treinos, dias da semana e duração para reutilização rápida.</span>
              </div>
              <div className="empty-state">
                <div className="empty-state-icon empty-state-icon--accent">
                  <BookOpen size={32} strokeWidth={1.2} />
                </div>
                <p className="empty-state-title">Nenhuma rotina ainda</p>
                <p>Crie seu primeiro modelo e use-o como base ao montar rotinas para seus alunos.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/trainer/protocol-templates/new')}
                >
                  + Criar primeira rotina
                </button>
              </div>
            </>
          )}

          {templates.length > 0 && viewMode === 'card' && (
            <div className="grid-cards">
              {templates.map((template) => {
                const levelLabel = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado', athlete: 'Atleta' }[template.trainingLevel];
                const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
                const hasBadges = levelLabel || typeLabel;
                const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
                return (
                  <div key={template.id} className="card">
                    <div className="card-header-row">
                      <h3 className="card-subtitle">{template.name}</h3>
                      <RowMenu
                        ariaLabel={`Ações da rotina ${template.name}`}
                        onEdit={() => navigate(`/trainer/protocol-templates/${template.id}/edit`)}
                        onDelete={() => handleDelete(template.id, template.name)}
                      />
                    </div>
                    {hasBadges && (
                      <div className="card-badges">
                        {levelLabel && <span className="badge badge-blue">{levelLabel}</span>}
                        {typeLabel && <span className="badge badge-gray">{typeLabel}</span>}
                      </div>
                    )}
                    {template.description && (
                      <p className="card-description text-clamp-2">{template.description}</p>
                    )}
                    <div className="card-stats">
                      <span className="stat-chip">
                        <Calendar size={14} strokeWidth={1.6} />
                        {template.defaultDurationWeeks ? `${template.defaultDurationWeeks} semanas` : '–'}
                      </span>
                      <span className="stat-chip">
                        <Dumbbell size={14} strokeWidth={1.6} />
                        {trainingsCount} {trainingsCount === 1 ? 'treino' : 'treinos'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {templates.length > 0 && viewMode === 'list' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th className="table-col-desktop-only">Duração</th>
                    <th className="table-col-desktop-only">Treinos</th>
                    <th className="table-col-desktop-only">Nível</th>
                    <th style={{ width: '48px' }} />
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => {
                    const levelLabel = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado', athlete: 'Atleta' }[template.trainingLevel];
                    const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
                    const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
                    return (
                      <tr key={template.id}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{template.name}</span>
                          <span className="table-col-mobile-only" style={{ display: 'block', fontSize: 'var(--font-caption-size)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                            {[
                              template.defaultDurationWeeks ? `${template.defaultDurationWeeks} sem.` : null,
                              `${trainingsCount} treinos`,
                              levelLabel,
                              typeLabel,
                            ].filter(Boolean).join(' · ')}
                          </span>
                        </td>
                        <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                          {template.defaultDurationWeeks ? `${template.defaultDurationWeeks} semanas` : '–'}
                        </td>
                        <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                          {trainingsCount}
                        </td>
                        <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                          {levelLabel || '—'}
                        </td>
                        <td>
                          <RowMenu
                            ariaLabel={`Ações do modelo ${template.name}`}
                            onEdit={() => navigate(`/trainer/protocol-templates/${template.id}/edit`)}
                            onDelete={() => handleDelete(template.id, template.name)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button type="button" onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Confirmar
              </button>
              <button type="button" onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
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
