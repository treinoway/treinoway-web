import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { replaceExerciseFromTemplate as performReplaceExerciseFromTemplate } from '../utils/exerciseReplacement';

// ─── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Extracts the exercises array from a training-template payload.
 * The backend junction relation is trainingTemplateExerciseTemplates.
 * Legacy field names (exerciseTemplates) are kept as fallbacks.
 */
const extractExercises = (raw) => {
  if (!raw) return [];
  return (
    raw.trainingTemplate?.trainingTemplateExerciseTemplates ||
    raw.trainingTemplateExerciseTemplates ||
    raw.trainingTemplate?.exerciseTemplates ||
    raw.exerciseTemplates ||
    []
  );
};

const normalizeTraining = (raw) => ({
  id: raw.trainingTemplate?.id || raw.id,
  name: raw.trainingTemplate?.name || raw.name,
  category: raw.trainingTemplate?.category || raw.category,
  bodySegment: raw.trainingTemplate?.bodySegment || raw.bodySegment || null,
  weekDay: raw.weekDay || null,
  description: raw.trainingTemplate?.description || raw.description || null,
  exercises: extractExercises(raw),
});

const normalizeRoutine = (raw) => ({
  id: raw.id,
  name: raw.name || '',
  type: raw.type || '',
  trainingLevel: raw.trainingLevel || '',
  defaultDurationWeeks: raw.defaultDurationWeeks ? String(raw.defaultDurationWeeks) : '',
  genderOrdination: raw.genderOrdination || '',
  description: raw.description || '',
  trainings: (raw.trainings || raw.scheduleTemplates || []).map(normalizeTraining),
});

// ─── useRoutineBuilder ────────────────────────────────────────────────────────

/**
 * Centralises all API interactions for the routine builder screen.
 *
 * @param {string|null} routineId - Existing protocol-template id, or null for a new routine.
 * @returns {object} State + mutation methods.
 */
const useRoutineBuilder = (routineId) => {
  const [loading, setLoading] = useState(!!routineId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(
    routineId
      ? null
      : { id: null, name: '', type: '', trainingLevel: '', defaultDurationWeeks: '', genderOrdination: '', description: '', trainings: [] }
  );
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);

  // ── Origin tracking (draft cleanup on discard) ────────────────────────────
  //
  // createdTrainingIds: training-templates POSTed during this session.
  // junctionsAddedToImported: exercise junctions added to IMPORTED trainings
  //   (trainings not in createdTrainingIds). Session-created trainings are
  //   excluded — their exercises are cascade-deleted with the training.
  //
  // Phase 1 limitation: updateExercise on a junction that belongs to an
  // imported training is not tracked. Edits to pre-existing junctions survive
  // discard. Phase 2 (snapshot-on-import) will resolve this.

  const [createdTrainingIds, setCreatedTrainingIds] = useState([]);
  const [junctionsAddedToImported, setJunctionsAddedToImported] = useState([]);
  // Ref mirrors createdTrainingIds so async mutate closures can read the
  // current value without stale closure capture.
  const createdTrainingIdsRef = useRef([]);

  const setCreatedTrainingIdsSync = useCallback((updater) => {
    setCreatedTrainingIds((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      createdTrainingIdsRef.current = next;
      return next;
    });
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!routineId) {
      setLoading(false);

      const fetchSupportingData = async () => {
        try {
          // Picker source lists — request limit=100; library pagination UI is out
          // of scope for the picker. If a trainer exceeds 100 templates the picker
          // truncates; acceptable for now (search box exists on the dedicated
          // library pages).
          const [trainingRes, exerciseRes] = await Promise.all([
            api.get('/trainer/training-templates', { params: { limit: 100 } }),
            api.get('/trainer/exercise-templates', { params: { limit: 100 } }),
          ]);
          setTrainingTemplates(trainingRes.data?.data || []);
          setExerciseTemplates(exerciseRes.data?.data || []);
        } catch (err) {
          setError(err.userMessage || err.message || 'Erro ao carregar dados.');
        }
      };

      fetchSupportingData();
      return;
    }

    const fetchRoutine = async () => {
      setLoading(true);
      setError(null);
      try {
        // Picker source lists — request limit=100; library pagination UI is out
        // of scope for the picker. If a trainer exceeds 100 templates the picker
        // truncates; acceptable for now (search box exists on the dedicated
        // library pages).
        const [routineRes, trainingRes, exerciseRes] = await Promise.all([
          api.get(`/trainer/protocol-templates/${routineId}`),
          api.get('/trainer/training-templates', { params: { limit: 100 } }),
          api.get('/trainer/exercise-templates', { params: { limit: 100 } }),
        ]);
        setData(normalizeRoutine(routineRes.data));
        setTrainingTemplates(trainingRes.data?.data || []);
        setExerciseTemplates(exerciseRes.data?.data || []);
      } catch (err) {
        setError(err.userMessage || err.message || 'Erro ao carregar rotina.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [routineId]);

  // ── Mutation wrapper ──────────────────────────────────────────────────────

  const mutate = useCallback(async (fn) => {
    setSaving(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err.userMessage || err.message || 'Erro ao salvar.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── updateMeta ────────────────────────────────────────────────────────────

  /**
   * Persist routine-level metadata (name, type, level, duration, gender,
   * description) by sending the full protocol payload to the API.
   * Only works on an existing routine (routineId != null).
   */
  const updateMeta = useCallback(
    (fields) =>
      mutate(async () => {
        if (!routineId) {
          setData((prev) => ({ ...prev, ...fields }));
          return;
        }
        const payload = {
          name: (fields.name ?? data?.name ?? '').trim(),
          ...(fields.type !== undefined && { type: fields.type }),
          ...(fields.trainingLevel !== undefined && { trainingLevel: fields.trainingLevel }),
          ...(fields.defaultDurationWeeks !== undefined && {
            defaultDurationWeeks: parseInt(fields.defaultDurationWeeks, 10) || undefined,
          }),
          ...(fields.genderOrdination !== undefined && { genderOrdination: fields.genderOrdination }),
          ...(fields.description !== undefined && fields.description?.trim() && { description: fields.description.trim() }),
        };
        const res = await api.patch(`/trainer/protocol-templates/${routineId}`, payload);
        setData((prev) => ({ ...prev, ...normalizeRoutine({ ...prev, ...res.data }) }));
      }),
    [mutate, routineId, data]
  );

  // ── saveRoutine ───────────────────────────────────────────────────────────

  /**
   * Create or update the full protocol template (meta + training list).
   * Returns the saved routine data.
   */
  const saveRoutine = useCallback(
    (meta, trainings) =>
      mutate(async () => {
        const payload = {
          name: (meta.name || '').trim(),
          ...(meta.description?.trim() && { description: meta.description.trim() }),
          ...(meta.type && { type: meta.type }),
          ...(meta.trainingLevel && { trainingLevel: meta.trainingLevel }),
          ...(meta.genderOrdination && { genderOrdination: meta.genderOrdination }),
          defaultDurationWeeks: parseInt(meta.defaultDurationWeeks, 10) || 12,
          trainings: trainings.map((t, idx) => ({
            trainingTemplateId: t.id,
            order: idx,
            weekDay: t.weekDay || null,
          })),
        };
        if (routineId) {
          const res = await api.patch(`/trainer/protocol-templates/${routineId}`, payload);
          setData((prev) => ({ ...prev, ...normalizeRoutine({ ...prev, ...res.data }) }));
          return res.data;
        } else {
          const res = await api.post('/trainer/protocol-templates', payload);
          setData(normalizeRoutine(res.data));
          // Resources are now part of a saved routine — reset tracking.
          setCreatedTrainingIdsSync([]);
          setJunctionsAddedToImported([]);
          return res.data;
        }
      }),
    [mutate, routineId, setCreatedTrainingIdsSync]
  );

  // ── createTraining ────────────────────────────────────────────────────────

  /**
   * POST /trainer/training-templates — creates a new training template and
   * appends it to the routine's training list.
   */
  const createTraining = useCallback(
    (trainingPayload) =>
      mutate(async () => {
        const res = await api.post('/trainer/training-templates', trainingPayload);
        const newTraining = { ...res.data, exercises: [] };
        setData((prev) => ({
          ...prev,
          trainings: [...prev.trainings, newTraining],
        }));
        setTrainingTemplates((prev) => [...prev, res.data]);
        setCreatedTrainingIdsSync((prev) => [...prev, res.data.id]);
        return res.data;
      }),
    [mutate, setCreatedTrainingIdsSync]
  );

  // ── importTrainingsFromLibrary ─────────────────────────────────────────────

  /**
   * Import one or more existing training templates into the routine's local
   * list. This is a client-side-only operation; the link is persisted when
   * saveRoutine is called.
   *
   * @param {string[]} ids - Training template ids to import.
   * @param {Record<string, object>} overrides - Optional per-training field
   *   overrides (e.g. { [id]: { weekDay: 'monday' } }). Used when restoring
   *   a draft so weekDay assignments survive the round-trip.
   */
  const importTrainingsFromLibrary = useCallback(
    (ids, overrides = {}) =>
      mutate(async () => {
        const toAdd = ids
          .map((id) => trainingTemplates.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => ({
            ...t,
            exercises: extractExercises(t),
            ...(overrides[t.id] || {}),
          }));
        setData((prev) => ({
          ...prev,
          trainings: [...prev.trainings, ...toAdd],
        }));
        return toAdd;
      }),
    [mutate, trainingTemplates]
  );

  // ── updateTraining ────────────────────────────────────────────────────────

  /**
   * PATCH /trainer/training-templates/:id — update name, weekday, category,
   * etc. on an existing training template.
   */
  const updateTraining = useCallback(
    (trainingId, fields) =>
      mutate(async () => {
        const res = await api.patch(`/trainer/training-templates/${trainingId}`, fields);
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId ? { ...t, ...res.data } : t
          ),
        }));
        return res.data;
      }),
    [mutate]
  );

  // ── updateTrainingWeekDay ─────────────────────────────────────────────────

  /**
   * Optimistic weekday assignment — local-only until saveRoutine is called.
   * The weekday lives on the protocol-training join, not on the training
   * template itself, so no API call is made here.
   */
  const updateTrainingWeekDay = useCallback((trainingId, weekDay) => {
    setData((prev) => ({
      ...prev,
      trainings: prev.trainings.map((t) =>
        t.id === trainingId ? { ...t, weekDay: weekDay || null } : t
      ),
    }));
  }, []);

  // ── deleteTraining ────────────────────────────────────────────────────────

  /**
   * Remove a training from the routine's local list. The deletion is
   * reflected on the server only when saveRoutine is called with the updated
   * trainings list.
   */
  const deleteTraining = useCallback((trainingId) => {
    setData((prev) => ({
      ...prev,
      trainings: prev.trainings.filter((t) => t.id !== trainingId),
    }));
    // Keep tracking in sync — remove from both arrays so discard cleanup
    // does not attempt a DELETE for a training already removed locally.
    setCreatedTrainingIdsSync((prev) => prev.filter((id) => id !== trainingId));
    setJunctionsAddedToImported((prev) => prev.filter((j) => j.trainingId !== trainingId));
  }, [setCreatedTrainingIdsSync]);

  // ── addExercise ───────────────────────────────────────────────────────────

  /**
   * POST /trainer/training-templates/:trainingId/exercises
   * Creates a new ad-hoc exercise and appends it to the training's list.
   */
  const addExercise = useCallback(
    (trainingId, exercisePayload) =>
      mutate(async () => {
        const res = await api.post(
          `/trainer/training-templates/${trainingId}/exercises`,
          exercisePayload
        );
        const newExercise = res.data;
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: [...t.exercises, newExercise] }
              : t
          ),
        }));
        // Track the junction only when added to an IMPORTED training.
        // Session-created trainings are fully deleted on discard (cascade).
        // Phase 1 limitation: updateExercise on an imported training junction
        // is not tracked — edits survive discard. Phase 2 will resolve this.
        if (!createdTrainingIdsRef.current.includes(trainingId)) {
          setJunctionsAddedToImported((prev) => [
            ...prev,
            { trainingId, junctionId: newExercise.id },
          ]);
        }
        return newExercise;
      }),
    [mutate]
  );

  // ── addExerciseFromTemplate ───────────────────────────────────────────────

  /**
   * POST /trainer/training-templates/:trainingId/exercises/from-template
   * Imports an exercise from the library into the training.
   */
  const addExerciseFromTemplate = useCallback(
    (trainingId, templateId) =>
      mutate(async () => {
        const res = await api.post(
          `/trainer/training-templates/${trainingId}/exercises/from-template`,
          { exerciseTemplateId: templateId }
        );
        const newExercise = res.data;
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: [...t.exercises, newExercise] }
              : t
          ),
        }));
        // Same tracking rule as addExercise — junction on imported training only.
        if (!createdTrainingIdsRef.current.includes(trainingId)) {
          setJunctionsAddedToImported((prev) => [
            ...prev,
            { trainingId, junctionId: newExercise.id },
          ]);
        }
        return newExercise;
      }),
    [mutate]
  );

  // ── updateExercise ────────────────────────────────────────────────────────

  /**
   * PATCH /trainer/training-templates/:trainingId/exercises/:exerciseId
   * exerciseId is the junction row id (TrainingTemplateExerciseTemplate).
   */
  const updateExercise = useCallback(
    (trainingId, exerciseId, fields) =>
      mutate(async () => {
        const res = await api.patch(
          `/trainer/training-templates/${trainingId}/exercises/${exerciseId}`,
          fields
        );
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? {
                  ...t,
                  exercises: t.exercises.map((ex) =>
                    ex.id === exerciseId ? { ...ex, ...res.data } : ex
                  ),
                }
              : t
          ),
        }));
        return res.data;
      }),
    [mutate]
  );

  // ── deleteExercise ────────────────────────────────────────────────────────

  /**
   * DELETE /trainer/training-templates/:trainingId/exercises/:exerciseId
   * exerciseId is the junction row id. Returns the deleted junction row (not 204).
   */
  const deleteExercise = useCallback(
    (trainingId, exerciseId) =>
      mutate(async () => {
        await api.delete(
          `/trainer/training-templates/${trainingId}/exercises/${exerciseId}`
        );
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: t.exercises.filter((ex) => ex.id !== exerciseId) }
              : t
          ),
        }));
        // Remove the junction from tracking if it was recorded there.
        setJunctionsAddedToImported((prev) =>
          prev.filter((j) => !(j.trainingId === trainingId && j.junctionId === exerciseId))
        );
      }),
    [mutate]
  );

  // ── reorderExercises ──────────────────────────────────────────────────────

  /**
   * Local-only reorder for training templates. There is no training-template
   * exercise-order endpoint, so the new order lives in the draft and persisted
   * template ordering is out of scope/deferred. Signature matches the protocol
   * builder so useExerciseReorder can call either interchangeably.
   */
  const reorderExercises = useCallback(
    (trainingId, orderedExerciseIds, reorderedExercises) => {
      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.map((t) =>
          t.id === trainingId ? { ...t, exercises: reorderedExercises } : t
        ),
      }));
      return Promise.resolve();
    },
    []
  );

  const replaceExerciseFromTemplate = useCallback(
    (trainingId, exerciseId, templateId, templateObject, fieldsPayload) =>
      mutate(async () => {
        const training = data.trainings.find((t) => t.id === trainingId);
        if (!training) throw new Error('Treino não encontrado.');
        return performReplaceExerciseFromTemplate({
          trainingId,
          exerciseId,
          templateId,
          exercises: training.exercises,
          addExerciseFromTemplate,
          updateExercise,
          deleteExercise,
          reorderExercises,
          fieldsPayload,
        });
      }),
    [mutate, data, addExerciseFromTemplate, updateExercise, deleteExercise, reorderExercises]
  );

  // ── saveExerciseAsTemplate ────────────────────────────────────────────────

  /**
   * POST /trainer/exercise-templates
   * Promotes an ad-hoc exercise definition to a reusable library template.
   * Note: this endpoint is not present in the legacy builder; it is exposed
   * here for the incoming RoutineBuilder UI.
   */
  const saveExerciseAsTemplate = useCallback(
    (exerciseData) =>
      mutate(async () => {
        const res = await api.post('/trainer/exercise-templates', exerciseData);
        setExerciseTemplates((prev) => [...prev, res.data]);
        return res.data;
      }),
    [mutate]
  );

  // ── restoreSessionTracking ────────────────────────────────────────────────

  /**
   * Restores origin-tracking arrays from a persisted draft.
   * Called by RoutineBuilder after importTrainingsFromLibrary completes
   * during the draft-restore flow.
   */
  const restoreSessionTracking = useCallback(({ createdTrainingIds: ids, junctionsAddedToImported: junctions }) => {
    setCreatedTrainingIdsSync(ids || []);
    setJunctionsAddedToImported(junctions || []);
  }, [setCreatedTrainingIdsSync]);

  // ── refetchTrainingExercises ──────────────────────────────────────────────

  /**
   * Re-fetch a single training-template's exercises and merge into local state.
   * Used after structural mutations the hook does not perform itself
   * (bi-set create/dissolve) so the UI converges with the server.
   */
  const refetchTrainingExercises = useCallback(async (trainingId) => {
    try {
      const res = await api.get(`/trainer/training-templates/${trainingId}`);
      const refreshed = extractExercises(res.data);
      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.map((t) =>
          t.id === trainingId ? { ...t, exercises: refreshed } : t
        ),
      }));
    } catch {
      // Silent — next user action will re-trigger. Keeps UI usable.
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    // state
    loading,
    saving,
    error,
    data,
    trainingTemplates,
    exerciseTemplates,
    createdTrainingIds,
    junctionsAddedToImported,
    // mutations
    updateMeta,
    saveRoutine,
    createTraining,
    importTrainingsFromLibrary,
    updateTraining,
    updateTrainingWeekDay,
    deleteTraining,
    addExercise,
    addExerciseFromTemplate,
    updateExercise,
    deleteExercise,
    reorderExercises,
    replaceExerciseFromTemplate,
    saveExerciseAsTemplate,
    restoreSessionTracking,
    refetchTrainingExercises,
  };
};

export default useRoutineBuilder;
