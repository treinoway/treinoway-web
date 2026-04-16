import { useState, useEffect } from 'react';
import { LayoutGrid, List, Dumbbell, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import CreateExerciseTemplateModal from '../../components/CreateExerciseTemplateModal';
import EditExerciseSheet from '../../components/EditExerciseSheet';
import ExerciseRowCard from '../../components/ExerciseRowCard';
import RowMenu from '../../components/RowMenu';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';
import { formatSnapshotSummary } from '../../utils/exerciseMeta';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';

/** @deprecated Use RowMenu from '../../components/RowMenu' instead */
export const TemplateRowMenu = RowMenu;

const CATEGORY_LABEL = TRAINING_CATEGORY_LABEL;
const BODY_SEGMENT_LABEL = { upper: 'Superior', lower: 'Inferior', full_body: 'Corpo Inteiro' };

const TrainingTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showExerciseTemplateModal, setShowExerciseTemplateModal] = useState(false);
  const [editingExerciseTemplate, setEditingExerciseTemplate] = useState(null);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [exercisePickerValue, setExercisePickerValue] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.trainingTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [exerciseJunctions, setExerciseJunctions] = useState([]);
  const [editingJunctionId, setEditingJunctionId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
    exerciseTemplateIds: [],
  });

  useEffect(() => {
    fetchTemplates();
    fetchExerciseTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/training-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch training templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchExerciseTemplates = async () => {
    try {
      const response = await api.get('/trainer/exercise-templates');
      setExerciseTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch exercise templates:', error);
    }
  };

  const normalizeExerciseTemplateIds = (ids) =>
    (ids || []).map((id) => (typeof id === 'number' ? id : Number.isNaN(Number(id)) ? id : Number(id)));

  /** Extract exercise template IDs from API response (handles exerciseTemplateIds, exerciseTemplates, or trainingTemplateExerciseTemplates) */
  const getExerciseTemplateIdsFromTemplate = (template) => {
    if (template.exerciseTemplateIds && Array.isArray(template.exerciseTemplateIds)) {
      return template.exerciseTemplateIds;
    }
    const junctionList = template.trainingTemplateExerciseTemplates;
    if (Array.isArray(junctionList)) {
      return junctionList
        .map((e) => e.exerciseTemplateId ?? e.exerciseTemplate?.id)
        .filter((id) => id != null);
    }
    const list = template.exerciseTemplates;
    if (!Array.isArray(list)) return [];
    return list.map((e) => e.exerciseTemplateId ?? e.id ?? e.exerciseTemplate?.id).filter((id) => id != null);
  };

  const buildExerciseTemplatesPayload = (ids) => {
    const normalizedIds = normalizeExerciseTemplateIds(ids);
    return normalizedIds.map((etId, index) => {
      const junction = exerciseJunctions.find(
        (j) => String(j.exerciseTemplateId) === String(etId),
      );
      if (!junction) {
        return { exerciseTemplateId: etId, order: index };
      }
      return {
        exerciseTemplateId: etId,
        order: index,
        name: junction.name,
        type: junction.type,
        videoUrl: junction.videoUrl,
        sets: junction.sets,
        repetitions: junction.repetitions,
        duration: junction.duration,
        hasLoad: junction.hasLoad,
        suggestedLoad: junction.suggestedLoad,
        restInterval: junction.restInterval,
        notes: junction.notes,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { exerciseTemplateIds, ...rest } = formData;
      const normalizedIds = normalizeExerciseTemplateIds(exerciseTemplateIds);
      const exerciseTemplatesPayload = buildExerciseTemplatesPayload(normalizedIds);
      const payload = {
        ...rest,
        ...(normalizedIds.length > 0
          ? { exerciseTemplates: exerciseTemplatesPayload }
          : { exerciseTemplates: [] }),
      };
      if (editingId) {
        await api.patch(`/trainer/training-templates/${editingId}`, payload);
        showToast('Treino único atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/training-templates', payload);
        showToast('Treino único criado com sucesso!', 'success');
      }
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getExerciseJunctionsFromTemplate = (template) => {
    if (Array.isArray(template?.trainingTemplateExerciseTemplates)) {
      return template.trainingTemplateExerciseTemplates;
    }
    return [];
  };

  const handleEdit = async (template) => {
    setEditingId(template.id);
    setLoadingEdit(true);
    setShowForm(true);
    try {
      const response = await api.get(`/trainer/training-templates/${template.id}`);
      const full = response.data;
      setFormData({
        name: full.name,
        description: full.description || '',
        category: full.category || '',
        bodySegment: full.bodySegment || '',
        isPublic: full.isPublic || false,
        exerciseTemplateIds: getExerciseTemplateIdsFromTemplate(full),
      });
      setExerciseJunctions(getExerciseJunctionsFromTemplate(full));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      setShowForm(false);
      setEditingId(null);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleOpenJunctionEdit = (exerciseTemplateId) => {
    setEditingJunctionId(exerciseTemplateId);
  };

  const handleCloseJunctionEdit = () => {
    setEditingJunctionId(null);
  };

  const applyPayloadToDraft = (junction, payload) => ({
    ...junction,
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.type !== undefined && { type: payload.type }),
    ...(payload.videoUrl !== undefined && { videoUrl: payload.videoUrl }),
    ...(payload.sets !== undefined && { sets: payload.sets }),
    ...(payload.repetitions !== undefined && { repetitions: payload.repetitions }),
    ...(payload.duration !== undefined && { duration: payload.duration }),
    ...(payload.hasLoad !== undefined && { hasLoad: payload.hasLoad }),
    ...(payload.suggestedLoad !== undefined && { suggestedLoad: payload.suggestedLoad }),
    ...(payload.restInterval !== undefined && { restInterval: payload.restInterval }),
    ...(payload.notes !== undefined && { notes: payload.notes }),
  });

  const handleSubmitJunctionEdit = async (payload) => {
    if (!editingJunctionId) return;
    const junction = exerciseJunctions.find(
      (j) => String(j.exerciseTemplateId) === String(editingJunctionId),
    );
    if (!junction) return;

    // Persisted junction (template already saved + junction has id): PATCH to snapshot endpoint
    if (junction.id && editingId) {
      try {
        const response = await api.patch(
          `/trainer/training-templates/${editingId}/exercises/${junction.id}`,
          payload,
        );
        showToast('Exercício atualizado', 'success');
        setEditingJunctionId(null);
        // Merge API response into local state so UI reflects server truth
        setExerciseJunctions((prev) =>
          prev.map((j) => (j.id === response.data.id ? { ...j, ...response.data } : j)),
        );
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error', {
          actionLabel: 'Tentar novamente',
          onAction: () => handleSubmitJunctionEdit(payload),
        });
      }
      return;
    }

    // Draft junction (template not yet saved, or exercise just added): update local state only.
    // The overrides are persisted when the main form is submitted (via buildExerciseTemplatesPayload).
    setExerciseJunctions((prev) =>
      prev.map((j) =>
        String(j.exerciseTemplateId) === String(editingJunctionId)
          ? applyPayloadToDraft(j, payload)
          : j,
      ),
    );
    showToast('Exercício atualizado', 'success');
    setEditingJunctionId(null);
  };

  const handleLightDiscard = () => {
    showToast('Alterações descartadas', 'success');
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este treino único? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/training-templates/${id}`);
          showToast('Treino único excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const buildDraftJunctionFromTemplate = (et) => ({
    // No `id` — this marks the row as a draft. Persisted via the main form's POST/PATCH.
    exerciseTemplateId: et.id,
    name: et.name ?? null,
    type: et.type ?? null,
    videoUrl: et.videoUrl ?? null,
    sets: et.sets ?? null,
    repetitions: et.repetitions ?? null,
    duration: et.duration ?? null,
    hasLoad: et.hasLoad ?? false,
    suggestedLoad: et.suggestedLoad ?? null,
    restInterval: et.restInterval ?? null,
    notes: et.notes ?? null,
    exerciseTemplate: { id: et.id, name: et.name, type: et.type },
  });

  const handleExercisePickerAdd = () => {
    if (!exercisePickerValue) return;
    if (formData.exerciseTemplateIds.includes(exercisePickerValue)) return;
    const et = exerciseTemplates.find(
      (t) => String(t.id) === String(exercisePickerValue),
    );
    setFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: [...prev.exerciseTemplateIds, exercisePickerValue],
    }));
    if (et) {
      setExerciseJunctions((prev) => {
        if (prev.some((j) => String(j.exerciseTemplateId) === String(et.id))) return prev;
        return [...prev, buildDraftJunctionFromTemplate(et)];
      });
    }
    setExercisePickerValue('');
  };

  const handleExercisePickerRemove = (templateId) => {
    setFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: prev.exerciseTemplateIds.filter((id) => id !== templateId),
    }));
    setExerciseJunctions((prev) =>
      prev.filter((j) => String(j.exerciseTemplateId) !== String(templateId)),
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      isPublic: false,
      exerciseTemplateIds: [],
    });
    setExercisePickerValue('');
    setEditingId(null);
    setShowForm(false);
    setExerciseJunctions([]);
    setEditingJunctionId(null);
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredTemplates = normalizedQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : templates;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <Dumbbell size={24} className="page-header-title-icon" />
          <h1>Treinos únicos</h1>
        </div>
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
              + Novo treino único
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
            placeholder="Buscar treino por nome..."
            aria-label="Buscar treinos"
          />
        </div>
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar treino único' : 'Criar novo treino único'}
          </h2>
          {loadingEdit ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <span className="loading-text">Carregando...</span>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="form">
            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label">Categoria</label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {TRAINING_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="form-label">Segmento Corporal</label>
                <Select
                  value={formData.bodySegment}
                  onChange={(e) => setFormData({ ...formData, bodySegment: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="upper">Superior</option>
                  <option value="lower">Inferior</option>
                  <option value="full_body">Corpo Inteiro</option>
                </Select>
              </div>
            </div>

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="isPublic" className="form-label mb-0">
                Tornar este modelo público
              </label>
            </div>

            <div className="form-section" style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
              <div className="form-section-header">
                <h3 className="form-section-title">Exercícios do treino</h3>
              </div>

              <div className="exercise-picker-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="tt-exercise-picker">Selecionar exercício existente</label>
                  <Select
                    id="tt-exercise-picker"
                    value={exercisePickerValue}
                    onChange={(e) => setExercisePickerValue(e.target.value)}
                  >
                    <option value="">Selecione um exercício...</option>
                    {exerciseTemplates.map((et) => (
                      <option key={et.id} value={et.id}>{et.name}</option>
                    ))}
                  </Select>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExercisePickerAdd}
                  disabled={!exercisePickerValue}
                  aria-label="Adicionar exercício ao treino"
                >
                  Adicionar
                </button>
              </div>

              {formData.exerciseTemplateIds.length > 0 && (
                <div className="exercise-list">
                  {formData.exerciseTemplateIds.map((etId) => {
                    const junction = exerciseJunctions.find(
                      (j) => String(j.exerciseTemplateId) === String(etId),
                    );
                    const et = exerciseTemplates.find((t) => String(t.id) === String(etId));
                    const name = junction?.name || et?.name || String(etId);
                    const summary = junction ? formatSnapshotSummary(junction) : null;
                    const sourceDeleted = !!junction && junction.exerciseTemplate == null;
                    return (
                      <div key={etId} className="training-template-exercise-row">
                        <ExerciseRowCard
                          name={name}
                          summary={summary}
                          sourceDeleted={sourceDeleted}
                          onClick={() => handleOpenJunctionEdit(etId)}
                          ariaLabel={`Editar exercício ${name}`}
                        />
                        <RowMenu
                          ariaLabel={`Ações do exercício ${name}`}
                          onDelete={() => handleExercisePickerRemove(etId)}
                          deleteLabel="Remover"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="exercise-list-actions">
                <button
                  type="button"
                  className="btn-schedule-sm"
                  onClick={() => setShowExerciseTemplateModal(true)}
                  aria-label="Criar novo exercício"
                >
                  + Criar novo exercício
                </button>
              </div>
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
          )}
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
            const categoryLabel = CATEGORY_LABEL[template.category];
            const bodySegmentLabel = BODY_SEGMENT_LABEL[template.bodySegment];
            const hasBadges = categoryLabel || bodySegmentLabel || template.isPublic;
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
                    {categoryLabel && <span className="badge badge-blue">{categoryLabel}</span>}
                    {bodySegmentLabel && <span className="badge badge-gray">{bodySegmentLabel}</span>}
                    {template.isPublic && <span className="badge badge-green">Público</span>}
                  </div>
                )}
                {template.description && (
                  <p className="card-description text-clamp-2">{template.description}</p>
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
                <th className="table-col-desktop-only">Categoria</th>
                <th className="table-col-desktop-only">Segmento</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{template.name}</span>
                      {template.isPublic && <span className="badge badge-green">Público</span>}
                    </div>
                    <span className="table-col-mobile-only" style={{ display: 'block', fontSize: 'var(--font-caption-size)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                      {[
                        template.category && (CATEGORY_LABEL[template.category] || template.category),
                        template.bodySegment && (BODY_SEGMENT_LABEL[template.bodySegment] || template.bodySegment),
                      ].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                    {CATEGORY_LABEL[template.category] || template.category || '—'}
                  </td>
                  <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                    {BODY_SEGMENT_LABEL[template.bodySegment] || template.bodySegment || '—'}
                  </td>
                  <td>
                    <TemplateRowMenu
                      ariaLabel={`Ações do modelo ${template.name}`}
                      onEdit={() => handleEdit(template)}
                      onDelete={() => handleDelete(template.id)}
                    />
                  </td>
                </tr>
              ))}
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
            <span><strong>O que é um treino único?</strong> Um treino único é uma ficha pré-configurada com categoria e segmento corporal que pode ser reutilizada em diferentes rotinas, agilizando a montagem dos treinos dos seus alunos.</span>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon empty-state-icon--accent">
              <Dumbbell size={32} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum treino único ainda</p>
            <p>Crie seu primeiro treino único e use-o como base ao montar rotinas para seus alunos.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>+ Criar primeiro treino</button>
          </div>
        </>
      )}

      {(showExerciseTemplateModal || editingExerciseTemplate) && (
        <CreateExerciseTemplateModal
          open
          exerciseTemplate={editingExerciseTemplate}
          onClose={() => {
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
          }}
          onSuccess={(result) => {
            const wasEditing = !!editingExerciseTemplate;
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
            fetchExerciseTemplates();
            if (!wasEditing && result?.id != null) {
              setFormData((prev) => ({
                ...prev,
                exerciseTemplateIds: [...prev.exerciseTemplateIds, result.id],
              }));
            }
          }}
        />
      )}

      {editingJunctionId && (() => {
        const junction = exerciseJunctions.find(
          (j) => String(j.exerciseTemplateId) === String(editingJunctionId),
        );
        if (!junction) return null;
        const sourceDeleted = junction.exerciseTemplate == null;
        return (
          <EditExerciseSheet
            snapshot={junction}
            exerciseName={junction.name || junction.exerciseTemplate?.name || 'Exercício'}
            sourceDeleted={sourceDeleted}
            onSubmit={handleSubmitJunctionEdit}
            onClose={handleCloseJunctionEdit}
            onLightDiscard={handleLightDiscard}
          />
        );
      })()}

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

export default TrainingTemplates;
