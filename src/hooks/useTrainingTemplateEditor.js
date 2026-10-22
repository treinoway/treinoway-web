import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import {
  EMPTY_TRAINING_TEMPLATE_FORM,
  buildFormFromTemplate,
  getExerciseJunctions,
  buildDraftJunction,
  applyPayloadToDraft,
  findJunction,
  buildTrainingTemplatePayload,
} from '../utils/trainingTemplateDraft';

const ENDPOINT = '/trainer/training-templates';
const EMPTY_DRAFT = { formData: EMPTY_TRAINING_TEMPLATE_FORM, junctions: [] };
const isSameId = (a, b) => String(a) === String(b);

/**
 * State and persistence for the Treino único editor page (create + edit share it).
 * `status`: 'loading' | 'ready' | 'notFound' | 'error'. `isDirty` compares the draft
 * (fields, exercise order, per-exercise overrides) with the last loaded/saved snapshot.
 */
const useTrainingTemplateEditor = (templateId) => {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const isEditing = !!templateId;
  const [status, setStatus] = useState(isEditing ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY_DRAFT));
  const [availableExercises, setAvailableExercises] = useState([]);
  const [saving, setSaving] = useState(false);

  const showError = useCallback(
    (error, options) => showToast(error.userMessage || translateError(error), 'error', options),
    [showToast],
  );

  const resetDraft = useCallback((next) => {
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, []);

  const fetchAvailableExercises = useCallback(async () => {
    try {
      // Picker source: first 100 templates. The dedicated library page has search/pagination.
      const response = await api.get('/trainer/exercise-templates', { params: { limit: 100 } });
      setAvailableExercises(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch exercise templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchAvailableExercises();
  }, [fetchAvailableExercises]);

  useEffect(() => {
    if (!templateId) return undefined;
    let cancelled = false;
    api
      .get(`${ENDPOINT}/${templateId}`)
      .then((response) => {
        if (cancelled) return;
        const full = response.data;
        resetDraft({ formData: buildFormFromTemplate(full), junctions: getExerciseJunctions(full) });
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        const isNotFound = error?.response?.status === 404;
        if (!isNotFound) setLoadError(error.userMessage || translateError(error));
        setStatus(isNotFound ? 'notFound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, reloadKey, resetDraft]);

  const retryLoad = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const updateField = (field, value) =>
    setDraft((prev) => ({ ...prev, formData: { ...prev.formData, [field]: value } }));

  const addExercise = (exerciseTemplate) =>
    setDraft((prev) => {
      const { exerciseTemplateIds } = prev.formData;
      if (exerciseTemplateIds.some((id) => isSameId(id, exerciseTemplate.id))) return prev;
      return {
        formData: { ...prev.formData, exerciseTemplateIds: [...exerciseTemplateIds, exerciseTemplate.id] },
        junctions: findJunction(prev.junctions, exerciseTemplate.id)
          ? prev.junctions
          : [...prev.junctions, buildDraftJunction(exerciseTemplate)],
      };
    });

  const removeExercise = (exerciseTemplateId) =>
    setDraft((prev) => ({
      formData: {
        ...prev.formData,
        exerciseTemplateIds: prev.formData.exerciseTemplateIds.filter((id) => !isSameId(id, exerciseTemplateId)),
      },
      junctions: prev.junctions.filter((j) => !isSameId(j.exerciseTemplateId, exerciseTemplateId)),
    }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = buildTrainingTemplatePayload(draft.formData, draft.junctions, { includeVisibility: isAdmin });
      if (isEditing) {
        await api.patch(`${ENDPOINT}/${templateId}`, payload);
        showToast('Treino único atualizado com sucesso!', 'success');
      } else {
        await api.post(ENDPOINT, payload);
        showToast('Treino único criado com sucesso!', 'success');
      }
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const applyDraftOverrides = (junction, payload) => {
    setDraft((prev) => ({
      ...prev,
      junctions: prev.junctions.map((j) => (isSameId(j.exerciseTemplateId, junction.exerciseTemplateId) ? applyPayloadToDraft(j, payload) : j)),
    }));
    showToast('Exercício atualizado', 'success');
    return true;
  };

  const persistJunction = async (junction, payload) => {
    try {
      const response = await api.patch(`${ENDPOINT}/${templateId}/exercises/${junction.id}`, payload);
      const merge = (junctions) => junctions.map((j) => (j.id === response.data.id ? { ...j, ...response.data } : j));
      setDraft((prev) => ({ ...prev, junctions: merge(prev.junctions) }));
      setBaseline((prev) => {
        const snapshot = JSON.parse(prev);
        return JSON.stringify({ ...snapshot, junctions: merge(snapshot.junctions) });
      });
      showToast('Exercício atualizado', 'success');
      return true;
    } catch (error) {
      showError(error, { actionLabel: 'Tentar novamente', onAction: () => persistJunction(junction, payload) });
      return false;
    }
  };

  const saveExerciseOverrides = async (exerciseTemplateId, payload) => {
    const junction = findJunction(draft.junctions, exerciseTemplateId);
    if (!junction) return false;
    if (!(junction.id && isEditing)) return applyDraftOverrides(junction, payload);
    return persistJunction(junction, payload);
  };

  return {
    isAdmin,
    isEditing,
    status,
    loadError,
    retryLoad,
    formData: draft.formData,
    junctions: draft.junctions,
    availableExercises,
    refreshAvailableExercises: fetchAvailableExercises,
    isDirty: JSON.stringify(draft) !== baseline,
    saving,
    updateField,
    addExercise,
    removeExercise,
    save,
    saveExerciseOverrides,
  };
};

export default useTrainingTemplateEditor;
