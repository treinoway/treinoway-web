import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, List, Dumbbell, Info, Layers } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';
import RowMenu from '../../components/RowMenu';
import ExerciseTemplateForm from '../../components/ExerciseTemplateForm';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';

const ExerciseTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.exerciseTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [formName, setFormName] = useState('');

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/exercise-templates');
      setTemplates(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (template) => {
    setEditingId(template.id);
    setFormName(template.name || '');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.',
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

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormName('');
  };

  const formatExerciseMeta = (template) => {
    const parts = [];
    if (template.type) parts.push(getExerciseTypeLabel(template.type));
    const reps = template.repetitions;
    const repsLabel = reps != null
      ? (reps.min === reps.max ? String(reps.min) : `${reps.min}–${reps.max}`)
      : null;
    if (template.sets != null && repsLabel != null) {
      parts.push(`${template.sets}x${repsLabel}`);
    } else if (template.duration != null) {
      parts.push(`${template.duration}s`);
    }
    if (template.hasLoad && template.suggestedLoad != null) {
      parts.push(`${template.suggestedLoad} kg`);
    }
    if (template.restInterval != null && template.restInterval > 0) {
      const minutes = Math.floor(template.restInterval / 60);
      const remaining = template.restInterval % 60;
      let formatted;
      if (minutes === 0) formatted = `${remaining}s`;
      else if (remaining === 0) formatted = `${minutes}min`;
      else formatted = `${minutes}min ${remaining}s`;
      parts.push(`Descanso: ${formatted}`);
    }
    return parts.length ? parts.join(' · ') : null;
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredTemplates = normalizedQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : templates;

  return (
    <div>
      {!showForm && (
        <div className="page-header">
          <div className="page-header-title-row">
            <h1>Exercícios</h1>
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
                <LayoutGrid size={16} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Visualização em lista"
              >
                <List size={16} strokeWidth={2} />
              </button>
            </div>
            {templates.length > 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                + Novo exercício
              </button>
            )}
          </div>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && (
        <div className="toolbar-search-wrapper">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            placeholder="Buscar exercício por nome..."
            aria-label="Buscar exercícios"
          />
        </div>
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

      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!showForm && !templatesLoading && filteredTemplates.length > 0 && viewMode === 'card' && (
        <div className="grid-cards">
          {filteredTemplates.map((template) => {
            const meta = formatExerciseMeta(template);
            const youtubeId = getYoutubeVideoId(template.videoUrl);
            const typeLabel = template.type ? getExerciseTypeLabel(template.type) : null;
            const hasBadges = typeLabel || template.isPublic;
            return (
              <div key={template.id} className="card">
                <div className="card-header-row">
                  <h3 className="card-subtitle">{template.name}</h3>
                  <RowMenu
                    ariaLabel={`Ações do modelo ${template.name}`}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => handleDelete(template.id)}
                  />
                </div>
                {hasBadges && (
                  <div className="card-badges">
                    {typeLabel && <span className="badge badge-blue">{typeLabel}</span>}
                    {template.isPublic && <span className="badge badge-green">Público</span>}
                  </div>
                )}
                {youtubeId && (
                  <div className="youtube-preview">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={`Vídeo do exercício ${template.name}`}
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                {meta && (
                  <div className="card-stats">
                    <span className="stat-chip">{meta}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showForm && !templatesLoading && filteredTemplates.length > 0 && viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="table-col-desktop-only">Meta</th>
                <th className="table-col-desktop-only">Vídeo</th>
                <th className="table-col-actions" />
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => {
                const meta = formatExerciseMeta(template);
                const hasVideo = !!getYoutubeVideoId(template.videoUrl);
                return (
                  <tr key={template.id}>
                    <td>
                      <span className="text-strong">{template.name}</span>
                      {meta && (
                        <span className="table-col-mobile-only table-cell-meta">
                          {meta}
                        </span>
                      )}
                      {template.isPublic && (
                        <span className="table-col-mobile-only badge badge-green table-cell-badge">
                          Público
                        </span>
                      )}
                    </td>
                    <td className="table-col-desktop-only">
                      <span className="table-cell-meta-inline">{meta || '—'}</span>
                      {template.isPublic && (
                        <span className="badge badge-green table-cell-badge-inline">Público</span>
                      )}
                    </td>
                    <td className="table-col-desktop-only">
                      {hasVideo ? (
                        <a
                          href={template.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge badge-blue"
                        >
                          YouTube
                        </a>
                      ) : (
                        <span className="text-steel">—</span>
                      )}
                    </td>
                    <td>
                      <RowMenu
                        ariaLabel={`Ações do modelo ${template.name}`}
                        onEdit={() => handleEdit(template)}
                        onDelete={() => handleDelete(template.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && filteredTemplates.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum resultado para &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length === 0 && (
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
