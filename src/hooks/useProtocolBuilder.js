import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { getLoadDefault } from '../constants/exerciseTypes';
import { replaceExerciseFromTemplate as performReplaceExerciseFromTemplate } from '../utils/exerciseReplacement';

// ─── Shape helpers ────────────────────────────────────────────────────────────

/**
 * Extracts a flat exercises array from a protocol-template training payload.
 * Handles both junction format (trainingTemplateExerciseTemplates) and legacy.
 */
const extractExercisesFromTemplate = (raw) => {
  if (!raw) return [];
  const junctions =
    raw.trainingTemplate?.trainingTemplateExerciseTemplates ||
    raw.trainingTemplateExerciseTemplates ||
    raw.trainingTemplate?.exerciseTemplates ||
    raw.exerciseTemplates ||
    [];
  return junctions
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((j) => ({
      id: j.id,
      _templateId: j.exerciseTemplate?.id || j.exerciseTemplateId || null,
      name: j.exerciseTemplate?.name || j.name || '',
      type: j.exerciseTemplate?.type || j.type || '',
      prescriptionMode: j.prescriptionMode ?? j.exerciseTemplate?.prescriptionMode ?? 'reps',
      sets: j.sets ?? j.exerciseTemplate?.sets ?? null,
      repetitions: j.repetitions ?? j.exerciseTemplate?.repetitions ?? null,
      duration: j.duration ?? j.exerciseTemplate?.duration ?? null,
      hasLoad: j.hasLoad ?? j.exerciseTemplate?.hasLoad ?? false,
      suggestedLoad: j.suggestedLoad ?? j.exerciseTemplate?.suggestedLoad ?? null,
      restInterval: j.restInterval ?? j.exerciseTemplate?.restInterval ?? null,
      videoUrl: j.videoUrl ?? j.exerciseTemplate?.videoUrl ?? null,
      intensity: j.intensity ?? j.exerciseTemplate?.intensity ?? null,
      notes: j.notes ?? j.exerciseTemplate?.notes ?? null,
      _isFromTemplate: true,
    }));
};

const makeTempId = () => `tmp_${crypto.randomUUID()}`;

// ─── Bulk-create payload mappers ────────────────────────────────────────────────
// The POST /trainer/protocols/with-trainings endpoint uses
// `additionalProperties: false`, so any unknown field (frontend-only flags, temp
// ids, *Label siblings) triggers a 400. These mappers build explicit allow-lists.

/**
 * Maps a local-state exercise to the bulk-create exercise shape.
 * Carries the template snapshot data directly and links the FK via
 * `exerciseTemplateId` — no separate `from-template` call is needed.
 */
const toBulkExercise = (exercise, index) => {
  const payload = {
    name: exercise.name || '',
    type: exercise.type || 'strength',
    order: index,
  };

  const templateId = exercise._templateId;
  if (templateId) payload.exerciseTemplateId = templateId;

  if (exercise.prescriptionMode != null) payload.prescriptionMode = exercise.prescriptionMode;
  if (exercise.sets != null) payload.sets = exercise.sets;
  if (exercise.repetitions != null) payload.repetitions = exercise.repetitions;
  if (exercise.duration != null) payload.duration = exercise.duration;
  if (exercise.hasLoad != null) payload.hasLoad = exercise.hasLoad;
  if (exercise.suggestedLoad != null) payload.suggestedLoad = exercise.suggestedLoad;
  if (exercise.restInterval != null) payload.restInterval = exercise.restInterval;
  if (exercise.notes != null && exercise.notes !== '') payload.notes = exercise.notes;
  if (exercise.intensity != null && exercise.intensity !== '') payload.intensity = exercise.intensity;
  if (exercise.videoUrl != null && exercise.videoUrl !== '') payload.videoUrl = exercise.videoUrl;

  return payload;
};

/**
 * Maps a local-state training to the bulk-create training shape, including its
 * nested exercises. Links the library template FK via `trainingTemplateId`.
 */
const toBulkTraining = (training, index) => {
  const payload = {
    name: training.name || 'Treino',
    category: training.category || 'strength',
    order: index,
  };

  const trainingTemplateId = training._trainingTemplateId;
  if (trainingTemplateId) payload.trainingTemplateId = trainingTemplateId;

  if (training.bodySegment) payload.bodySegment = training.bodySegment;
  if (training.weekDay) payload.weekDay = training.weekDay;
  if (training.description) payload.description = training.description;

  payload.exercises = (training.exercises || []).map(toBulkExercise);

  return payload;
};

// ─── useProtocolBuilder ───────────────────────────────────────────────────────

/**
 * Manages protocol builder state.
 *
 * Create mode (protocolId = null):
 *   All mutations are LOCAL (deferred). saveRoutine persists everything in a
 *   single request: POST /trainer/protocols/with-trainings (protocol header +
 *   all training days + all exercises in one transaction).
 *
 * Edit mode (protocolId set):
 *   On mount, loads protocol + trainings + exercises from the API.
 *   All mutations are EAGER — every change hits the backend immediately.
 *   saveRoutine is a no-op (returns { id: protocolId }).
 *
 * @param {string|null} studentId   - Student (assignee) id, or null.
 * @param {object}      [opts]      - Options.
 * @param {string|null} [opts.protocolId] - If set, enters edit mode for existing protocol.
 */
const useProtocolBuilder = (studentId, { protocolId = null } = {}) => {
  const isEditMode = !!protocolId;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    id: protocolId || null,
    name: '',
    type: '',
    trainingLevel: '',
    genderOrdination: '',
    description: '',
    startDate: '',
    expirationDate: '',
    assigneeId: studentId || null,
    trainings: [],
  });

  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [protocolTemplates, setProtocolTemplates] = useState([]);
  const [student, setStudent] = useState(null);

  // Protocol builder never has eager-created training IDs (all deferred in create mode).
  // These are returned to keep the surface identical to useRoutineBuilder.
  const [createdTrainingIds] = useState([]);
  const [junctionsAddedToImported] = useState([]);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isEditMode) {
          // Edit mode: load protocol with trainings + exercises in parallel with library data
          // Picker source lists — request limit=100; library pagination UI is
          // out of scope for the picker. If a trainer exceeds 100 templates the
          // picker truncates; acceptable for now (search box exists on the
          // dedicated library pages).
          const [protocolRes, templatesRes, exTemplatesRes, protocolTemplatesRes] =
            await Promise.all([
              api.get(`/trainer/protocols/${protocolId}`),
              api.get('/trainer/training-templates', { params: { limit: 100 } }),
              api.get('/trainer/exercise-templates', { params: { limit: 100 } }),
              api.get('/trainer/protocol-templates', { params: { limit: 100 } }),
            ]);

          const protocol = protocolRes.data;
          setTrainingTemplates(templatesRes.data?.data || []);
          setExerciseTemplates(exTemplatesRes.data?.data || []);
          setProtocolTemplates(protocolTemplatesRes.data?.data || []);

          // Load exercises for each training in parallel
          const rawTrainings = protocol.trainings || [];
          const exercisesPerTraining = await Promise.all(
            rawTrainings.map((t) =>
              api
                .get(`/trainer/trainings/${t.id}/exercises`)
                .then((r) => r.data || [])
                .catch(() => [])
            )
          );

          const trainingsWithExercises = rawTrainings.map((t, i) => ({
            ...t,
            exercises: exercisesPerTraining[i],
          }));

          setData({
            id: protocol.id,
            name: protocol.name || '',
            type: protocol.type || '',
            trainingLevel: protocol.trainingLevel || '',
            genderOrdination: protocol.genderOrdination || '',
            description: protocol.description || '',
            startDate: protocol.startDate || '',
            expirationDate: protocol.expirationDate || '',
            assigneeId: protocol.assigneeId || null,
            trainings: trainingsWithExercises,
          });

          if (protocol.assignee) {
            setStudent(protocol.assignee);
          }
        } else {
          // Create mode: load library data + optionally find the student
          // Picker source lists — request limit=100; library pagination UI is
          // out of scope for the picker. If a trainer exceeds 100 templates the
          // picker truncates; acceptable for now (search box exists on the
          // dedicated library pages).
          const requests = [
            api.get('/trainer/training-templates', { params: { limit: 100 } }),
            api.get('/trainer/exercise-templates', { params: { limit: 100 } }),
            api.get('/trainer/protocol-templates', { params: { limit: 100 } }),
          ];

          if (studentId) {
            requests.push(api.get('/trainer/students'));
          }

          const results = await Promise.all(requests);
          setTrainingTemplates(results[0].data?.data || []);
          setExerciseTemplates(results[1].data?.data || []);
          setProtocolTemplates(results[2].data?.data || []);

          if (studentId && results[3]) {
            const students = results[3].data || [];
            const found = students.find((s) => String(s.id) === String(studentId));
            if (found) {
              setStudent(found);
              setData((prev) => ({ ...prev, assigneeId: found.id }));
            }
          }
        }
      } catch (err) {
        setError(err.userMessage || err.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [protocolId, studentId, isEditMode]);

  // ── mutate ─────────────────────────────────────────────────────────────────
  // In create mode: local-only state updates.
  // In edit mode: wraps API calls with saving/error lifecycle.

  const mutate = useCallback(async (fn) => {
    setSaving(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err.userMessage || err.message || 'Erro ao salvar.');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── updateMeta ────────────────────────────────────────────────────────────

  const updateMeta = useCallback(
    (fields) =>
      mutate(async () => {
        if (isEditMode) {
          const res = await api.patch(`/trainer/protocols/${protocolId}`, fields);
          setData((prev) => ({
            ...prev,
            ...fields,
            // Ensure dates from server response take precedence (they are normalized)
            ...(res.data?.startDate !== undefined && { startDate: res.data.startDate }),
            ...(res.data?.expirationDate !== undefined && { expirationDate: res.data.expirationDate }),
          }));
        } else {
          setData((prev) => ({ ...prev, ...fields }));
        }
      }),
    [mutate, isEditMode, protocolId]
  );

  // ── createTraining ─────────────────────────────────────────────────────────

  const createTraining = useCallback(
    (trainingPayload) =>
      mutate(async () => {
        if (isEditMode) {
          const res = await api.post(`/trainer/protocols/${protocolId}/trainings`, {
            name: trainingPayload.name || 'Treino',
            category: trainingPayload.category || 'strength',
            ...(trainingPayload.bodySegment && { bodySegment: trainingPayload.bodySegment }),
            ...(trainingPayload.weekDay && { weekDay: trainingPayload.weekDay }),
            ...(trainingPayload.description && { description: trainingPayload.description }),
          });
          const newTraining = { ...res.data, exercises: [] };
          setData((prev) => ({
            ...prev,
            trainings: [...prev.trainings, newTraining],
          }));
          return newTraining;
        }

        const newTraining = {
          ...trainingPayload,
          id: makeTempId(),
          weekDay: trainingPayload.weekDay || null,
          exercises: [],
          _isNew: true,
        };
        setData((prev) => ({
          ...prev,
          trainings: [...prev.trainings, newTraining],
        }));
        return newTraining;
      }),
    [mutate, isEditMode, protocolId]
  );

  // ── importTrainingsFromLibrary ─────────────────────────────────────────────

  const importTrainingsFromLibrary = useCallback(
    (ids, overrides = {}) =>
      mutate(async () => {
        if (isEditMode) {
          const created = [];
          for (const id of ids) {
            const tmpl = trainingTemplates.find((t) => t.id === id);
            if (!tmpl) continue;
            const res = await api.post('/trainer/trainings/from-template', {
              protocolId,
              templateId: id,
              ...(overrides[id] || {}),
            });
            // Backend returns the new training with exercises already populated
            // (single-transaction import). Preserve that payload as-is so the
            // exercises survive into local state.
            const newTraining = { ...res.data, exercises: res.data?.exercises || [] };
            setData((prev) => ({
              ...prev,
              trainings: [...prev.trainings, newTraining],
            }));
            created.push(newTraining);
          }
          return created;
        }

        const toAdd = ids
          .map((id) => trainingTemplates.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => ({
            id: makeTempId(),
            name: t.name || '',
            category: t.category || '',
            bodySegment: t.bodySegment || null,
            weekDay: null,
            description: t.description || null,
            exercises: extractExercisesFromTemplate(t),
            _trainingTemplateId: t.id,
            _isImported: true,
            ...(overrides[t.id] || {}),
          }));
        setData((prev) => ({
          ...prev,
          trainings: [...prev.trainings, ...toAdd],
        }));
        return toAdd;
      }),
    [mutate, isEditMode, protocolId, trainingTemplates]
  );

  // ── updateTraining ─────────────────────────────────────────────────────────

  const updateTraining = useCallback(
    (trainingId, fields) =>
      mutate(async () => {
        if (isEditMode) {
          await api.patch(`/trainer/trainings/${trainingId}`, fields);
        }
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId ? { ...t, ...fields } : t
          ),
        }));
      }),
    [mutate, isEditMode]
  );

  // ── updateTrainingWeekDay ──────────────────────────────────────────────────

  const updateTrainingWeekDay = useCallback(
    (trainingId, weekDay) => {
      const newWeekDay = weekDay || null;

      if (isEditMode) {
        // Capture previous value for revert on failure
        let previousWeekDay;
        setData((prev) => {
          const training = prev.trainings.find((t) => t.id === trainingId);
          previousWeekDay = training ? training.weekDay : undefined;
          return {
            ...prev,
            trainings: prev.trainings.map((t) =>
              t.id === trainingId ? { ...t, weekDay: newWeekDay } : t
            ),
          };
        });

        setSaving(true);
        api
          .patch(`/trainer/trainings/${trainingId}`, { weekDay: newWeekDay })
          .catch((err) => {
            // Revert optimistic update
            setData((prev) => ({
              ...prev,
              trainings: prev.trainings.map((t) =>
                t.id === trainingId ? { ...t, weekDay: previousWeekDay } : t
              ),
            }));
            showToast(err.userMessage || err.message || 'Erro ao salvar dia da semana.');
          })
          .finally(() => setSaving(false));
        return;
      }

      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.map((t) =>
          t.id === trainingId ? { ...t, weekDay: newWeekDay } : t
        ),
      }));
    },
    [isEditMode, showToast]
  );

  // ── deleteTraining ─────────────────────────────────────────────────────────

  const deleteTraining = useCallback(
    (trainingId) => {
      if (isEditMode) {
        // Capture removed training for revert on failure
        let removedTraining;
        let removedIndex;
        setData((prev) => {
          removedIndex = prev.trainings.findIndex((t) => t.id === trainingId);
          removedTraining = prev.trainings[removedIndex];
          return {
            ...prev,
            trainings: prev.trainings.filter((t) => t.id !== trainingId),
          };
        });

        setSaving(true);
        api
          .delete(`/trainer/trainings/${trainingId}`)
          .catch((err) => {
            // Revert optimistic removal
            setData((prev) => {
              if (removedTraining === undefined) return prev;
              const trainings = [...prev.trainings];
              trainings.splice(removedIndex, 0, removedTraining);
              return { ...prev, trainings };
            });
            showToast(err.userMessage || err.message || 'Erro ao excluir treino.');
          })
          .finally(() => setSaving(false));
        return;
      }

      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.filter((t) => t.id !== trainingId),
      }));
    },
    [isEditMode, showToast]
  );

  // ── addExercise ────────────────────────────────────────────────────────────

  const addExercise = useCallback(
    (trainingId, exercisePayload) =>
      mutate(async () => {
        if (isEditMode) {
          const { id: _id, _isNew: _n, _isFromTemplate: _ift, _templateId: _tid, ...cleanPayload } = exercisePayload;
          const res = await api.post(`/trainer/trainings/${trainingId}/exercises`, cleanPayload);
          const newExercise = res.data;
          setData((prev) => ({
            ...prev,
            trainings: prev.trainings.map((t) =>
              t.id === trainingId
                ? { ...t, exercises: [...t.exercises, newExercise] }
                : t
            ),
          }));
          return newExercise;
        }

        const newExercise = {
          ...exercisePayload,
          id: makeTempId(),
          _isNew: true,
        };
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: [...t.exercises, newExercise] }
              : t
          ),
        }));
        return newExercise;
      }),
    [mutate, isEditMode]
  );

  // ── addExerciseFromTemplate ────────────────────────────────────────────────

  const addExerciseFromTemplate = useCallback(
    (trainingId, templateId, overrides = {}) =>
      mutate(async () => {
        if (isEditMode) {
          const res = await api.post('/trainer/exercises/from-template', {
            trainingId,
            templateId,
            ...(overrides.prescriptionMode !== undefined && {
              prescriptionMode: overrides.prescriptionMode,
            }),
          });
          // Backend hardcodes hasLoad:false when the caller omits it (the
          // ExerciseTemplate model carries no hasLoad field). Apply the
          // type-based default only when the backend returned a nullish value —
          // an explicit boolean false from a trainer-built template is preserved.
          const newExercise = {
            ...res.data,
            hasLoad: res.data.hasLoad ?? getLoadDefault(res.data.type),
          };
          setData((prev) => ({
            ...prev,
            trainings: prev.trainings.map((t) =>
              t.id === trainingId
                ? { ...t, exercises: [...t.exercises, newExercise] }
                : t
            ),
          }));
          return newExercise;
        }

        // Prefer the resolved template object passed in by the caller (e.g. from
        // LibraryPanel's seenMap, via ExerciseComposer). The paginated/searched
        // `exerciseTemplates` list only holds the first page, so a template
        // surfaced via search may not be present in it — falling back to
        // `.find()` in that case silently produces an exercise with no name.
        const template = overrides.template || exerciseTemplates.find((t) => t.id === templateId);
        const effectiveType = template?.type || '';
        const newExercise = {
          id: makeTempId(),
          _templateId: templateId,
          name: template?.name || '',
          type: effectiveType,
          prescriptionMode: overrides.prescriptionMode ?? template?.prescriptionMode ?? 'reps',
          sets: template?.sets ?? null,
          repetitions: template?.repetitions ?? null,
          duration: template?.duration ?? null,
          // Use the type-based default when the template doesn't carry an explicit
          // boolean — preserves a real false set by the trainer, fills in when absent.
          hasLoad: template?.hasLoad ?? getLoadDefault(effectiveType),
          suggestedLoad: template?.suggestedLoad ?? null,
          restInterval: template?.restInterval ?? null,
          videoUrl: template?.videoUrl ?? null,
          intensity: template?.intensity ?? null,
          notes: template?.notes ?? null,
          _isFromTemplate: true,
        };
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: [...t.exercises, newExercise] }
              : t
          ),
        }));
        return newExercise;
      }),
    [mutate, isEditMode, exerciseTemplates]
  );

  // ── updateExercise ─────────────────────────────────────────────────────────

  const updateExercise = useCallback(
    (trainingId, exerciseId, fields) =>
      mutate(async () => {
        if (isEditMode) {
          await api.patch(`/trainer/exercises/${exerciseId}`, fields);
        }
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? {
                  ...t,
                  exercises: t.exercises.map((ex) =>
                    ex.id === exerciseId ? { ...ex, ...fields } : ex
                  ),
                }
              : t
          ),
        }));
      }),
    [mutate, isEditMode]
  );

  // ── deleteExercise ─────────────────────────────────────────────────────────

  const deleteExercise = useCallback(
    (trainingId, exerciseId) =>
      mutate(async () => {
        if (isEditMode) {
          await api.delete(`/trainer/exercises/${exerciseId}`);
        }
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId
              ? { ...t, exercises: t.exercises.filter((ex) => ex.id !== exerciseId) }
              : t
          ),
        }));
      }),
    [mutate, isEditMode]
  );

  // ── reorderExercises ───────────────────────────────────────────────────────

  /**
   * Persist a new exercise order for a training.
   *
   * Persisted training (edit mode + real UUID): PATCH the order endpoint, then
   * mirror the reordered array into local state.
   * Draft training (create mode OR temp id): local-only — saveRoutine POSTs
   * exercises in array order, so the local order persists on save.
   *
   * Errors propagate so useExerciseReorder rolls back + toasts.
   */
  const reorderExercises = useCallback(
    (trainingId, orderedExerciseIds, reorderedExercises) => {
      const isPersisted = isEditMode && !String(trainingId).startsWith('tmp_');

      const applyLocalOrder = () =>
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId ? { ...t, exercises: reorderedExercises } : t
          ),
        }));

      if (!isPersisted) {
        applyLocalOrder();
        return Promise.resolve();
      }

      return mutate(async () => {
        await api.patch(`/trainer/trainings/${trainingId}/exercises/order`, {
          exerciseIds: orderedExerciseIds,
        });
        applyLocalOrder();
      });
    },
    [mutate, isEditMode]
  );

  const replaceExerciseFromTemplate = useCallback(
    (trainingId, exerciseId, templateId, templateObject) =>
      mutate(async () => {
        const training = data.trainings.find((t) => t.id === trainingId);
        if (!training) throw new Error('Treino não encontrado.');
        return performReplaceExerciseFromTemplate({
          trainingId,
          exerciseId,
          templateId,
          exercises: training.exercises,
          addExerciseFromTemplate: (tId, tmplId) =>
            addExerciseFromTemplate(tId, tmplId, { template: templateObject }),
          updateExercise,
          deleteExercise,
          reorderExercises,
        });
      }),
    [mutate, data, addExerciseFromTemplate, updateExercise, deleteExercise, reorderExercises]
  );

  // ── saveExerciseAsTemplate ─────────────────────────────────────────────────

  const saveExerciseAsTemplate = useCallback(
    (exerciseData) =>
      mutate(async () => {
        const res = await api.post('/trainer/exercise-templates', exerciseData);
        setExerciseTemplates((prev) => [...prev, res.data]);
        return res.data;
      }),
    [mutate]
  );

  // ── loadFromTemplate ───────────────────────────────────────────────────────

  const loadFromTemplate = useCallback(
    async (templateId) => {
      setSaving(true);
      setError(null);
      try {
        const res = await api.get(`/trainer/protocol-templates/${templateId}`);
        const tmpl = res.data;
        const scheduleItems = tmpl.scheduleTemplates || tmpl.trainings || [];
        const importedTrainings = scheduleItems.map((st) => {
          const tt = st.trainingTemplate || {};
          return {
            id: makeTempId(),
            name: tt.name || st.name || '',
            category: tt.category || st.category || '',
            bodySegment: tt.bodySegment || st.bodySegment || null,
            weekDay: (st.weekDay || '').toLowerCase() || null,
            description: tt.description || st.description || null,
            exercises: extractExercisesFromTemplate(st),
            _trainingTemplateId: tt.id || st.trainingTemplateId || null,
            _isImported: true,
          };
        });
        setData((prev) => ({
          ...prev,
          name: prev.name || tmpl.name || '',
          type: prev.type || tmpl.type || '',
          trainingLevel: prev.trainingLevel || tmpl.trainingLevel || '',
          genderOrdination: prev.genderOrdination || tmpl.genderOrdination || '',
          description: prev.description || tmpl.description || '',
          trainings: importedTrainings,
        }));
      } catch (err) {
        setError(err.userMessage || err.message || 'Erro ao importar template.');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ── saveRoutine ────────────────────────────────────────────────────────────

  /**
   * Create mode: single-request save. Builds one nested payload and fires
   *   POST /trainer/protocols/with-trainings
   * (protocol header + all training days + all exercises in one transaction).
   * Template-backed exercises carry their snapshot data inline and link the FK
   * via `exerciseTemplateId` — no separate `from-template` calls.
   *
   * Edit mode: no-op — all mutations were already persisted eagerly.
   */
  const saveRoutine = useCallback(
    (meta, trainings) =>
      mutate(async () => {
        if (isEditMode) {
          // Everything is already saved — just return the protocol id.
          return { id: protocolId };
        }

        const payload = {
          assigneeId: meta.assigneeId || data.assigneeId,
          name: (meta.name || '').trim(),
          startDate: meta.startDate || data.startDate,
          ...(meta.expirationDate && { expirationDate: meta.expirationDate }),
          ...(data.expirationDate && !meta.expirationDate && { expirationDate: data.expirationDate }),
          ...(meta.type && { type: meta.type }),
          ...(meta.trainingLevel && { trainingLevel: meta.trainingLevel }),
          ...(meta.genderOrdination && { genderOrdination: meta.genderOrdination }),
          ...(meta.description?.trim() && { description: meta.description.trim() }),
          trainings: (trainings || []).map(toBulkTraining),
        };

        const res = await api.post('/trainer/protocols/with-trainings', payload);
        const newProtocolId = res.data?.id;

        if (!newProtocolId) {
          throw new Error('Falha ao criar protocolo: ID não retornado.');
        }

        return { id: newProtocolId, ...res.data };
      }),
    [mutate, isEditMode, protocolId, data]
  );

  // ── restoreSessionTracking ────────────────────────────────────────────────
  // No-op in protocol mode — kept for API surface compatibility.

  const restoreSessionTracking = useCallback(() => {}, []);

  // ── hydrateFromDraft ──────────────────────────────────────────────────────

  /**
   * Restores create-mode state from a persisted protocol draft (see
   * useProtocolDraft). Unlike template mode — where the draft only stores
   * training-template ids re-imported via importTrainingsFromLibrary —
   * protocol trainings are local-only objects (many built from scratch, with
   * inline-edited exercises and temp ids), so the full trainings array is
   * restored verbatim instead of re-derived from the library.
   *
   * No-op in edit mode: edit-mode mutations are already persisted eagerly,
   * so there is nothing to hydrate from a local draft.
   */
  const hydrateFromDraft = useCallback(
    ({ meta, trainings: draftTrainings } = {}) => {
      if (isEditMode) return;
      setData((prev) => ({
        ...prev,
        type: meta?.type ?? prev.type,
        trainingLevel: meta?.trainingLevel ?? prev.trainingLevel,
        genderOrdination: meta?.genderOrdination ?? prev.genderOrdination,
        description: meta?.description ?? prev.description,
        startDate: meta?.startDate ?? prev.startDate,
        expirationDate: meta?.expirationDate ?? prev.expirationDate,
        assigneeId: meta?.assigneeId ?? prev.assigneeId,
        trainings: Array.isArray(draftTrainings) && draftTrainings.length > 0
          ? draftTrainings
          : prev.trainings,
      }));
    },
    [isEditMode]
  );

  // ── refetchTrainingExercises ──────────────────────────────────────────────

  /**
   * Re-fetch a single training's exercises and merge into local state. Used
   * after structural mutations the hook itself does not perform (bi-set
   * create/dissolve, substitute add/remove) so the UI converges with the
   * server without a full page reload.
   */
  const refetchTrainingExercises = useCallback(
    async (trainingId) => {
      if (!isEditMode) return;
      try {
        const res = await api.get(`/trainer/trainings/${trainingId}/exercises`);
        setData((prev) => ({
          ...prev,
          trainings: prev.trainings.map((t) =>
            t.id === trainingId ? { ...t, exercises: res.data || [] } : t
          ),
        }));
      } catch {
        // Surface via the next saving call. Silent fallback keeps the UI usable.
      }
    },
    [isEditMode]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return {
    // state
    loading,
    saving,
    error,
    data,
    trainingTemplates,
    exerciseTemplates,
    protocolTemplates,
    student,
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
    hydrateFromDraft,
    loadFromTemplate,
    refetchTrainingExercises,
  };
};

export default useProtocolBuilder;
