import { useState, useCallback } from 'react';
import api from '../api/axios';
import { buildSubstituteFromTemplate, toSubstituteApiBody } from '../utils/substituteBody';

// Owns the single exercise drawer of the routine screen: which training/exercise it targets and its save handlers.
const useExerciseDrawer = ({ routine, onMutate, onExerciseCreated, localSubstitutes = false }) => {
  const [target, setTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const openAdd = useCallback((trainingId) => setTarget({ trainingId, exercise: null }), []);
  const openEdit = useCallback((trainingId, exercise) => setTarget({ trainingId, exercise }), []);
  const openAddSubstitute = useCallback(
    (trainingId, principal, onSaved) => setTarget({ trainingId, exercise: null, principal, onSaved }),
    []
  );
  const openEditSubstitute = useCallback(
    (trainingId, principal, substitute, onSaved) => setTarget({ trainingId, exercise: substitute, principal, onSaved }),
    []
  );
  const close = useCallback(() => setTarget(null), []);

  const runSubstituteSave = async (save) => {
    onMutate();
    setSubmitting(true);
    try {
      await save();
    } finally {
      setSubmitting(false);
    }
    target.onSaved?.();
    close();
  };

  const addSubstitute = (body) => runSubstituteSave(async () => {
    const { trainingId, principal } = target;
    if (localSubstitutes) {
      await routine.addLocalSubstitute(trainingId, principal.id, body);
      return;
    }
    await api.post(`/trainer/exercises/${principal.id}/substitutes`, toSubstituteApiBody(body));
    await routine.refetchTrainingExercises(trainingId);
  });

  const editSubstitute = (substituteId, body) => runSubstituteSave(async () => {
    const { trainingId, principal } = target;
    if (localSubstitutes) {
      await routine.updateLocalSubstitute(trainingId, principal.id, substituteId, body);
      return;
    }
    await api.patch(`/trainer/exercises/${substituteId}`, toSubstituteApiBody(body));
    await routine.refetchTrainingExercises(trainingId);
  });

  const handleCreate = async (payload) => {
    if (target.principal) return addSubstitute(payload);
    onMutate();
    const created = await routine.addExercise(target.trainingId, payload);
    close();
    onExerciseCreated(created);
    return created;
  };

  const handleEdit = async (exerciseId, payload) => {
    if (target.principal) return editSubstitute(exerciseId, payload);
    onMutate();
    await routine.updateExercise(target.trainingId, exerciseId, payload);
    close();
  };

  const handleImport = async (templateIds, templatesById) => {
    // why: a substitute is always a single library pick, never a bulk import of normal exercises
    if (target.principal) return [];
    onMutate();
    const results = [];
    // why: sequential awaits keep the server-assigned order equal to the selection order
    for (const templateId of templateIds) {
      results.push(
        await routine.addExerciseFromTemplate(target.trainingId, templateId, {
          template: templatesById?.[templateId],
        })
      );
    }
    close();
    return results;
  };

  const handleAddFromTemplate = async (templateId, overrides) => {
    if (target.principal) {
      return addSubstitute(buildSubstituteFromTemplate(overrides.template, overrides, { local: localSubstitutes }));
    }
    onMutate();
    const created = await routine.addExerciseFromTemplate(target.trainingId, templateId, overrides);
    close();
    onExerciseCreated(created);
    return created;
  };

  const handleDelete = async () => {
    onMutate();
    const { trainingId, exercise } = target;
    close();
    await routine.deleteExercise(trainingId, exercise.id);
  };

  return {
    target, submitting, openAdd, openEdit, openAddSubstitute, openEditSubstitute, close,
    handleCreate, handleEdit, handleImport, handleAddFromTemplate, handleDelete,
  };
};

export default useExerciseDrawer;
