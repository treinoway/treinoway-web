import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

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
      sets: j.sets ?? j.exerciseTemplate?.sets ?? null,
      repetitions: j.repetitions ?? j.exerciseTemplate?.repetitions ?? null,
      duration: j.duration ?? j.exerciseTemplate?.duration ?? null,
      hasLoad: j.hasLoad ?? j.exerciseTemplate?.hasLoad ?? false,
      suggestedLoad: j.suggestedLoad ?? j.exerciseTemplate?.suggestedLoad ?? null,
      notes: j.notes ?? j.exerciseTemplate?.notes ?? null,
      _isFromTemplate: true,
    }));
};

const makeTempId = () => `tmp_${crypto.randomUUID()}`;

// ─── useProtocolBuilder ───────────────────────────────────────────────────────

/**
 * Manages protocol builder state.
 *
 * Create mode (protocolId = null):
 *   All mutations are LOCAL (deferred). saveRoutine performs the multi-step
 *   sequence: POST /trainer/protocols → POST trainings × N → POST exercises × N.
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
          const [protocolRes, templatesRes, exTemplatesRes, protocolTemplatesRes] =
            await Promise.all([
              api.get(`/trainer/protocols/${protocolId}`),
              api.get('/trainer/training-templates'),
              api.get('/trainer/exercise-templates'),
              api.get('/trainer/protocol-templates'),
            ]);

          const protocol = protocolRes.data;
          setTrainingTemplates(templatesRes.data || []);
          setExerciseTemplates(exTemplatesRes.data || []);
          setProtocolTemplates(protocolTemplatesRes.data || []);

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
          const requests = [
            api.get('/trainer/training-templates'),
            api.get('/trainer/exercise-templates'),
            api.get('/trainer/protocol-templates'),
          ];

          if (studentId) {
            requests.push(api.get('/trainer/students'));
          }

          const results = await Promise.all(requests);
          setTrainingTemplates(results[0].data || []);
          setExerciseTemplates(results[1].data || []);
          setProtocolTemplates(results[2].data || []);

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
            const res = await api.post(`/trainer/protocols/${protocolId}/trainings`, {
              name: tmpl.name || 'Treino',
              category: tmpl.category || 'strength',
              ...(tmpl.bodySegment && { bodySegment: tmpl.bodySegment }),
              ...(tmpl.description && { description: tmpl.description }),
              ...((overrides[id] || {})),
            });
            const newTraining = { ...res.data, exercises: [] };
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
      if (isEditMode) {
        setSaving(true);
        api
          .patch(`/trainer/trainings/${trainingId}`, { weekDay: weekDay || null })
          .catch((err) => setError(err.userMessage || err.message || 'Erro ao salvar.'))
          .finally(() => setSaving(false));
      }
      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.map((t) =>
          t.id === trainingId ? { ...t, weekDay: weekDay || null } : t
        ),
      }));
    },
    [isEditMode]
  );

  // ── deleteTraining ─────────────────────────────────────────────────────────

  const deleteTraining = useCallback(
    (trainingId) => {
      if (isEditMode) {
        setSaving(true);
        api
          .delete(`/trainer/trainings/${trainingId}`)
          .catch((err) => setError(err.userMessage || err.message || 'Erro ao excluir.'))
          .finally(() => setSaving(false));
      }
      setData((prev) => ({
        ...prev,
        trainings: prev.trainings.filter((t) => t.id !== trainingId),
      }));
    },
    [isEditMode]
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
    (trainingId, templateId) =>
      mutate(async () => {
        if (isEditMode) {
          const res = await api.post('/trainer/exercises/from-template', {
            trainingId,
            templateId,
          });
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

        const template = exerciseTemplates.find((t) => t.id === templateId);
        const newExercise = {
          id: makeTempId(),
          _templateId: templateId,
          name: template?.name || '',
          type: template?.type || '',
          sets: template?.sets ?? null,
          repetitions: template?.repetitions ?? null,
          duration: template?.duration ?? null,
          hasLoad: template?.hasLoad ?? false,
          suggestedLoad: template?.suggestedLoad ?? null,
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
   * Create mode: multi-step save sequence.
   * Edit mode: no-op — all mutations were already persisted eagerly.
   */
  const saveRoutine = useCallback(
    (meta, trainings) =>
      mutate(async () => {
        if (isEditMode) {
          // Everything is already saved — just return the protocol id.
          return { id: protocolId };
        }

        const protocolPayload = {
          assigneeId: meta.assigneeId || data.assigneeId,
          name: (meta.name || '').trim(),
          startDate: meta.startDate || data.startDate,
          ...(meta.expirationDate && { expirationDate: meta.expirationDate }),
          ...(data.expirationDate && !meta.expirationDate && { expirationDate: data.expirationDate }),
          ...(meta.type && { type: meta.type }),
          ...(meta.trainingLevel && { trainingLevel: meta.trainingLevel }),
          ...(meta.genderOrdination && { genderOrdination: meta.genderOrdination }),
          ...(meta.description?.trim() && { description: meta.description.trim() }),
        };

        // Step 1: create the protocol
        const protocolRes = await api.post('/trainer/protocols', protocolPayload);
        const newProtocolId = protocolRes.data?.id;

        if (!newProtocolId) {
          throw new Error('Falha ao criar protocolo: ID não retornado.');
        }

        try {
          // Step 2 + 3: create trainings, then exercises per training
          for (const training of trainings) {
            const trainingPayload = {
              name: training.name || 'Treino',
              category: training.category || 'strength',
              ...(training.bodySegment && { bodySegment: training.bodySegment }),
              ...(training.weekDay && { weekDay: training.weekDay }),
              ...(training.description && { description: training.description }),
            };

            const trainingRes = await api.post(
              `/trainer/protocols/${newProtocolId}/trainings`,
              trainingPayload
            );
            const trainingId = trainingRes.data?.id;
            if (!trainingId) continue;

            for (const exercise of training.exercises || []) {
              if (exercise._isFromTemplate && exercise._templateId) {
                await api.post('/trainer/exercises/from-template', {
                  trainingId,
                  templateId: exercise._templateId,
                });
              } else {
                const { id: _id, _isNew: _new, _isFromTemplate: _ift, _templateId: _tid, ...exercisePayload } = exercise;
                await api.post(
                  `/trainer/trainings/${trainingId}/exercises`,
                  exercisePayload
                );
              }
            }
          }
        } catch (err) {
          // Best-effort cleanup
          try {
            await api.delete(`/trainer/protocols/${newProtocolId}`);
          } catch {
            // ignore cleanup errors
          }
          throw err;
        }

        return { id: newProtocolId, ...protocolRes.data };
      }),
    [mutate, isEditMode, protocolId, data]
  );

  // ── restoreSessionTracking ────────────────────────────────────────────────
  // No-op in protocol mode — kept for API surface compatibility.

  const restoreSessionTracking = useCallback(() => {}, []);

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
    saveExerciseAsTemplate,
    restoreSessionTracking,
    loadFromTemplate,
  };
};

export default useProtocolBuilder;
