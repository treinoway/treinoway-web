import { useState, useEffect, useCallback, useRef } from 'react';
import { Dumbbell, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import CreateExerciseTemplateModal from '../../components/CreateExerciseTemplateModal';
import EditExerciseSheet from '../../components/EditExerciseSheet';
import ExerciseRowCard from '../../components/ExerciseRowCard';
import RowMenu from '../../components/RowMenu';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import LibraryBatchBar from '../../components/LibraryBatchBar';
import { formatSnapshotSummary } from '../../utils/exerciseMeta';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS, BODY_SEGMENT_LABEL } from '../../constants/bodySegments';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';

/** @deprecated Use RowMenu from '../../components/RowMenu' instead */
export const TemplateRowMenu = RowMenu;

const CATEGORY_LABEL = TRAINING_CATEGORY_LABEL;

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const ALL_FILTER = 'all';

const CATEGORY_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...TRAINING_CATEGORY_OPTIONS,
];

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
  const [exerciseJunctions, setExerciseJunctions] = useState([]);
  const [editingJunctionId, setEditingJunctionId] = useState(null);

  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [bodySegment, setBodySegment] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const debounceRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
    exerciseTemplateIds: [],
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const params = { page, limit: PAGE_LIMIT };
      if (q) params.q = q;
      if (category) params.category = category;
      if (bodySegment) params.bodySegment = bodySegment;
      const response = await api.get('/trainer/training-templates', { params });
      setTemplates(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [page, q, category, bodySegment, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Selection is per-page: drop it whenever the page/query/filters change.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, q, category, bodySegment]);

  const fetchExerciseTemplates = async () => {
    try {
      // Picker source list — request limit=100; library pagination UI is out of
      // scope for the picker. If a trainer exceeds 100 templates the picker
      // truncates; acceptable for now (search box exists on the dedicated
      // library pages).
      const response = await api.get('/trainer/exercise-templates', { params: { limit: 100 } });
      setExerciseTemplates(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch exercise templates:', error);
    }
  };

  useEffect(() => {
    fetchExerciseTemplates();
  }, []);

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
        prescriptionMode: junction.prescriptionMode,
        intensity: junction.intensity,
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
    ...(payload.prescriptionMode !== undefined && { prescriptionMode: payload.prescriptionMode }),
    ...(payload.intensity !== undefined && { intensity: payload.intensity }),
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
      message: 'Excluir este treino único? Esta ação não pode ser desfeita.',
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
          const res = await api.post('/trainer/training-templates/batch-delete', {
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

  const handleCategoryFilterChange = (value) => {
    setCategory(value === ALL_FILTER ? '' : value);
    setPage(1);
  };

  const handleBodySegmentChange = (value) => {
    setBodySegment(value);
    setPage(1);
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
    prescriptionMode: et.prescriptionMode ?? 'reps',
    intensity: et.intensity ?? null,
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

  const hasActiveFilters = !!q || !!category || !!bodySegment;
  const isEmptyLibrary = total === 0 && !hasActiveFilters;
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const showList = !showForm && !templatesLoading && !isEmptyLibrary;
  const activeCategoryValue = category || ALL_FILTER;

  const pageIds = templates.map((t) => t.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : [...pageIds]);
  };

  const bodySegmentSelect = (
    <Select
      value={bodySegment}
      onChange={(e) => handleBodySegmentChange(e.target.value)}
      aria-label="Filtrar por segmento"
    >
      <option value="">Todos os segmentos</option>
      {BODY_SEGMENT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <Dumbbell size={24} strokeWidth={2} className="page-header-title-icon" />
          <h1>Treinos únicos</h1>
        </div>
        <div className="page-header-actions">
          {!showForm && !isEmptyLibrary && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Novo treino único
            </button>
          )}
        </div>
      </div>

      {showList && (
        <LibraryFilterBar
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Buscar treino por nome…"
          searchAriaLabel="Buscar treinos"
          filters={CATEGORY_FILTERS}
          activeFilter={activeCategoryValue}
          onFilterChange={handleCategoryFilterChange}
          sortSelect={bodySegmentSelect}
        />
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar treino único' : 'Criar novo treino único'}
          </h2>
          {loadingEdit ? (
            <div className="loading-screen loading-screen--inline">
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

            <div className="form-section form-section--divided">
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
                    {exerciseTemplates.map((et) => {
                      const typeLabel = et.typeLabel || (et.type ? getExerciseTypeLabel(et.type) : null);
                      return (
                        <option key={et.id} value={et.id}>
                          {typeLabel ? `${et.name} (${typeLabel})` : et.name}
                        </option>
                      );
                    })}
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
                          emptyHint="Toque para definir séries, repetições e carga"
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

      {showList && (
        <>
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
              const categoryLabel = CATEGORY_LABEL[template.category];
              const bodySegmentLabel = BODY_SEGMENT_LABEL[template.bodySegment];

              const badges = (
                <>
                  {categoryLabel && <span className="badge badge-blue">{categoryLabel}</span>}
                  {bodySegmentLabel && <span className="badge badge-gray">{bodySegmentLabel}</span>}
                  {template.isPublic && <span className="badge badge-green">Público</span>}
                </>
              );

              const subtitle = [
                categoryLabel,
                bodySegmentLabel,
              ].filter(Boolean).join(' · ') || null;

              return (
                <LibraryListRow
                  key={template.id}
                  title={template.name}
                  subtitle={subtitle}
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

      {!showForm && !templatesLoading && isEmptyLibrary && (
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
              setFormData((prev) => {
                const alreadyAdded = prev.exerciseTemplateIds.some(
                  (id) => String(id) === String(result.id),
                );
                if (alreadyAdded) return prev;
                return {
                  ...prev,
                  exerciseTemplateIds: [...prev.exerciseTemplateIds, result.id],
                };
              });
              setExerciseJunctions((prev) => {
                if (prev.some((j) => String(j.exerciseTemplateId) === String(result.id))) {
                  return prev;
                }
                return [...prev, buildDraftJunctionFromTemplate(result)];
              });
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
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
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

export default TrainingTemplates;
