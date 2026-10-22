import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

const NOT_FOUND_STATUS = 404;

const toExercise = (junction) => ({
  ...junction.exerciseTemplate,
  sets: junction.sets,
  repetitions: junction.repetitions,
  duration: junction.duration,
  hasLoad: junction.hasLoad,
  suggestedLoad: junction.suggestedLoad,
  restInterval: junction.restInterval,
  notes: junction.notes ?? junction.exerciseTemplate?.notes,
});

const fetchTrainingExercises = async (item) => {
  const trainingTemplateId = item.trainingTemplate?.id;
  if (!trainingTemplateId) return [];
  try {
    const response = await api.get(`/trainer/training-templates/${trainingTemplateId}`);
    const junctions = response.data?.trainingTemplateExerciseTemplates || [];
    return junctions.map(toExercise).filter((exercise) => exercise.id);
  } catch {
    return [];
  }
};

const loadRoutine = async (id) => {
  const response = await api.get(`/trainer/protocol-templates/${id}`);
  const template = response.data;
  if (!template) return { status: 'notFound' };

  const trainings = [...(template.trainings || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const exercisesByTraining = {};
  await Promise.all(
    trainings.map(async (item) => {
      exercisesByTraining[item.id] = await fetchTrainingExercises(item);
    }),
  );
  return { status: 'ready', template, trainings, exercisesByTraining };
};

const toFailure = (error) => {
  if (error?.response?.status === NOT_FOUND_STATUS) return { status: 'notFound' };
  console.error('Failed to fetch protocol template:', error);
  return { status: 'error', message: error?.userMessage || translateError(error) };
};

/**
 * Loads a routine template and the exercises of each of its trainings.
 * Data is keyed by `id`: until the current id answers, the status reads as
 * 'loading'; a late response for a previous id is ignored.
 * Status: 'loading' | 'ready' | 'notFound' | 'error'.
 */
const useRoutineTemplateView = (id) => {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadRoutine(id)
      .catch(toFailure)
      .then((outcome) => {
        if (!cancelled) setResult({ id, ...outcome });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const reload = useCallback(() => {
    setResult(null);
    setAttempt((value) => value + 1);
  }, []);

  const current = result?.id === id ? result : null;
  return { status: current?.status ?? 'loading', data: current, reload };
};

export default useRoutineTemplateView;
