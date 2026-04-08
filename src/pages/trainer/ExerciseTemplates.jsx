import { useState, useEffect } from 'react';
import { LayoutGrid, List, Dumbbell, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';
import RowMenu from '../../components/RowMenu';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';

const ExerciseTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.exerciseTemplates);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    videoUrl: '',
    isPublic: false,
    sets: '',
    repetitionsMin: '',
    repetitionsMax: '',
    duration: '',
    restInterval: '',
    hasLoad: false,
    suggestedLoad: '',
    notes: '',
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
    if (data.repetitionsMin !== '' && data.repetitionsMin != null && data.repetitionsMax !== '' && data.repetitionsMax != null) {
      payload.repetitions = { min: parseInt(data.repetitionsMin, 10), max: parseInt(data.repetitionsMax, 10) };
    }
    if (data.duration !== '' && data.duration != null) payload.duration = parseInt(data.duration, 10);
    if (data.restInterval !== '' && data.restInterval != null) payload.restInterval = parseInt(data.restInterval, 10);
    if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
      payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
    }
    if (data.notes?.trim()) payload.notes = data.notes.trim();
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = buildPayload(formData);
      if (editingId) {
        await api.patch(`/trainer/exercise-templates/${editingId}`, payload);
        showToast('Exercício atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/exercise-templates', payload);
        showToast('Exercício criado com sucesso!', 'success');
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
      repetitionsMin: template.repetitions?.min ?? '',
      repetitionsMax: template.repetitions?.max ?? '',
      duration: template.duration ?? '',
      restInterval: template.restInterval ?? '',
      hasLoad: template.hasLoad || false,
      suggestedLoad: template.suggestedLoad ?? '',
      notes: template.notes || '',
    });
    setEditingId(template.id);
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
    setFormData({
      name: '',
      type: '',
      videoUrl: '',
      isPublic: false,
      sets: '',
      repetitionsMin: '',
      repetitionsMax: '',
      duration: '',
      restInterval: '',
      hasLoad: false,
      suggestedLoad: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
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
      <div className="page-header">
        <h1>Exercícios</h1>
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
          {!showForm && templates.length > 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Novo exercício
            </button>
          )}
        </div>
      </div>

      {!showForm && !templatesLoading && templates.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
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
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar exercício' : 'Criar novo exercício'}
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
              <label className="form-label" htmlFor="exercise-videoUrl">URL do vídeo</label>
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
                <label className="form-label" htmlFor="exercise-sets">Séries</label>
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
                <label className="form-label">Repetições</label>
                <div className="grid-2col" style={{ gap: 'var(--spacing-xs)' }}>
                  <input
                    id="exercise-repetitions-min"
                    type="number"
                    min="1"
                    value={formData.repetitionsMin}
                    onChange={(e) => setFormData({ ...formData, repetitionsMin: e.target.value })}
                    className="form-input"
                    aria-label="Repetições mínimas"
                    placeholder="Mín"
                  />
                  <input
                    id="exercise-repetitions-max"
                    type="number"
                    min="1"
                    value={formData.repetitionsMax}
                    onChange={(e) => setFormData({ ...formData, repetitionsMax: e.target.value })}
                    className="form-input"
                    aria-label="Repetições máximas"
                    placeholder="Máx"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="exercise-duration">Duração em segundos</label>
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

            <div>
              <label className="form-label" htmlFor="exercise-restInterval">Intervalo de descanso (segundos)</label>
              <input
                id="exercise-restInterval"
                type="number"
                min="0"
                value={formData.restInterval}
                onChange={(e) => setFormData({ ...formData, restInterval: e.target.value })}
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

            <div>
              <label className="form-label" htmlFor="exercise-notes">Observações</label>
              <textarea
                id="exercise-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="form-textarea"
                placeholder="Orientações ou anotações sobre este exercício"
              />
            </div>

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

      {!showForm && !templatesLoading && filteredTemplates.length > 0 && viewMode === 'card' && (
        <div className="grid-cards">
          {filteredTemplates.map((template) => {
            const meta = formatExerciseMeta(template);
            const youtubeId = getYoutubeVideoId(template.videoUrl);
            return (
              <div key={template.id} className="card">
                <div className="card-header">
                  <h3 className="card-subtitle" style={{ marginBottom: 0 }}>{template.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    {template.isPublic && (
                      <span className="badge badge-green">Público</span>
                    )}
                    <RowMenu
                      ariaLabel={`Ações do modelo ${template.name}`}
                      onEdit={() => handleEdit(template)}
                      onDelete={() => handleDelete(template.id)}
                    />
                  </div>
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
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => {
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
            <div className="empty-state-icon">
              <Dumbbell size={48} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum exercício ainda</p>
            <p>Crie seu primeiro exercício para começar</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Novo exercício
            </button>
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="overlay">
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
