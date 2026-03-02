import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { LayoutGrid, List, MoreVertical } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';

const TemplateRowMenu = ({ onEdit, onDelete, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="row-menu" ref={menuRef}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={18} strokeWidth={1.6} />
      </button>
      {open && (
        <div className="row-menu-dropdown">
          <button type="button" className="row-menu-item" onClick={() => { setOpen(false); onEdit(); }}>
            Editar
          </button>
          <button type="button" className="row-menu-item row-menu-item--danger" onClick={() => { setOpen(false); onDelete(); }}>
            Excluir
          </button>
        </div>
      )}
    </div>
  );
};

TemplateRowMenu.propTypes = {
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

const ExerciseTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.exerciseTemplates);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    videoUrl: '',
    isPublic: false,
    sets: '',
    repetitions: '',
    duration: '',
    hasLoad: false,
    suggestedLoad: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/exercise-templates');
      setTemplates(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const buildPayload = (data) => {
    const payload = {
      name: data.name,
      type: data.type,
      isPublic: data.isPublic,
      hasLoad: data.hasLoad,
    };
    if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
    if (data.sets !== '' && data.sets != null) payload.sets = parseInt(data.sets, 10);
    if (data.repetitions !== '' && data.repetitions != null) payload.repetitions = parseInt(data.repetitions, 10);
    if (data.duration !== '' && data.duration != null) payload.duration = parseInt(data.duration, 10);
    if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
      payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = buildPayload(formData);
      if (editingId) {
        await api.patch(`/trainer/exercise-templates/${editingId}`, payload);
        showToast('Modelo de exercício atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/exercise-templates', payload);
        showToast('Modelo de exercício criado com sucesso!', 'success');
      }
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name || '',
      type: template.type || '',
      videoUrl: template.videoUrl || '',
      isPublic: template.isPublic || false,
      sets: template.sets ?? '',
      repetitions: template.repetitions ?? '',
      duration: template.duration ?? '',
      hasLoad: template.hasLoad || false,
      suggestedLoad: template.suggestedLoad ?? '',
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este modelo de exercício? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/exercise-templates/${id}`);
          showToast('Modelo de exercício excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      videoUrl: '',
      isPublic: false,
      sets: '',
      repetitions: '',
      duration: '',
      hasLoad: false,
      suggestedLoad: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatExerciseMeta = (template) => {
    const parts = [];
    if (template.type) parts.push(getExerciseTypeLabel(template.type));
    if (template.sets != null && template.repetitions != null) {
      parts.push(`${template.sets}x${template.repetitions}`);
    } else if (template.duration != null) {
      parts.push(`${template.duration}s`);
    }
    if (template.hasLoad && template.suggestedLoad != null) {
      parts.push(`${template.suggestedLoad} kg`);
    }
    return parts.length ? parts.join(' · ') : null;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de Exercício</h1>
        <div className="page-header-actions">
          {!showForm && (
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
          )}
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Novo Modelo de Exercício
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar Modelo de Exercício' : 'Criar Novo Modelo de Exercício'}
          </h2>
          <form onSubmit={handleSubmit} className="form">
            <div>
              <label className="form-label" htmlFor="exercise-name">Nome</label>
              <input
                id="exercise-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="exercise-type">Tipo</label>
              <select
                id="exercise-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Selecione...</option>
                {EXERCISE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="exercise-videoUrl">URL do vídeo (opcional)</label>
              <input
                id="exercise-videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="form-input"
                placeholder="https://..."
              />
              {getYoutubeVideoId(formData.videoUrl) && (
                <div className="youtube-preview" style={{ marginTop: 'var(--spacing-sm)' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${getYoutubeVideoId(formData.videoUrl)}`}
                    title="Preview do vídeo do exercício"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label" htmlFor="exercise-sets">Séries (opcional)</label>
                <input
                  id="exercise-sets"
                  type="number"
                  min="1"
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="exercise-repetitions">Repetições (opcional)</label>
                <input
                  id="exercise-repetitions"
                  type="number"
                  min="1"
                  value={formData.repetitions}
                  onChange={(e) => setFormData({ ...formData, repetitions: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="exercise-duration">Duração em segundos (opcional)</label>
              <input
                id="exercise-duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="form-input"
                placeholder="Ex: 60"
              />
            </div>

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="exercise-hasLoad"
                checked={formData.hasLoad}
                onChange={(e) => setFormData({ ...formData, hasLoad: e.target.checked })}
              />
              <label htmlFor="exercise-hasLoad" className="form-label mb-0">
                Exercício com carga
              </label>
            </div>

            {formData.hasLoad && (
              <div>
                <label className="form-label" htmlFor="exercise-suggestedLoad">Carga sugerida (kg)</label>
                <input
                  id="exercise-suggestedLoad"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.suggestedLoad}
                  onChange={(e) => setFormData({ ...formData, suggestedLoad: e.target.value })}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="exercise-isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="exercise-isPublic" className="form-label mb-0">
                Tornar este modelo público
              </label>
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && viewMode === 'card' && (
        <div className="grid-cards">
          {templates.map((template) => {
            const meta = formatExerciseMeta(template);
            const youtubeId = getYoutubeVideoId(template.videoUrl);
            return (
              <div key={template.id} className="card">
                <div className="card-header-start">
                  <h3 className="card-subtitle">{template.name}</h3>
                  {template.isPublic && (
                    <span className="badge badge-green">Público</span>
                  )}
                </div>
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
                  <div className="info-list mb-md" style={{ paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-outline-variant)' }}>
                    <div className="text-sm text-light">{meta}</div>
                  </div>
                )}
                <div className="btn-group">
                  <button onClick={() => handleEdit(template)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="btn-delete">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="table-col-desktop-only">Meta</th>
                <th className="table-col-desktop-only">Vídeo</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const meta = formatExerciseMeta(template);
                const hasVideo = !!getYoutubeVideoId(template.videoUrl);
                return (
                  <tr key={template.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{template.name}</span>
                      {meta && (
                        <span className="table-col-mobile-only" style={{ display: 'block', fontSize: 'var(--font-caption-size)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                          {meta}
                        </span>
                      )}
                      {template.isPublic && (
                        <span className="table-col-mobile-only badge badge-green" style={{ marginTop: '4px' }}>Público</span>
                      )}
                    </td>
                    <td className="table-col-desktop-only">
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                        {meta || '—'}
                      </span>
                      {template.isPublic && (
                        <span className="badge badge-green" style={{ marginLeft: 'var(--spacing-xs)' }}>Público</span>
                      )}
                    </td>
                    <td className="table-col-desktop-only">
                      {hasVideo ? (
                        <a
                          href={template.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge badge-blue"
                          style={{ textDecoration: 'none' }}
                        >
                          YouTube
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <TemplateRowMenu
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

      {!showForm && !templatesLoading && templates.length === 0 && (
        <>
          <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>O que é um modelo de exercício?</strong> Um modelo de exercício é um exercício
            reutilizável que pode ser adicionado aos seus treinos. Defina séries, repetições,
            carga sugerida e até link de vídeo para facilitar a montagem das rotinas.
          </div>
          <div className="empty-state">
            <p className="empty-state-title">Nenhum modelo de exercício ainda</p>
            <p>Crie seu primeiro modelo de exercício para começar</p>
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
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
