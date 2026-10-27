import { useState, useCallback } from 'react';

// Owns the single exercise drawer of the routine screen: which training/exercise it targets and its save handlers.
const useExerciseDrawer = ({ routine, onMutate, onExerciseCreated }) => {
  const [target, setTarget] = useState(null);

  const openAdd = useCallback((trainingId) => setTarget({ trainingId, exercise: null }), []);
  const openEdit = useCallback((trainingId, exercise) => setTarget({ trainingId, exercise }), []);
  const close = useCallback(() => setTarget(null), []);

  const handleCreate = async (payload) => {
    onMutate();
    const created = await routine.addExercise(target.trainingId, payload);
    close();
    onExerciseCreated(created);
    return created;
  };

  const handleEdit = async (exerciseId, payload) => {
    onMutate();
    await routine.updateExercise(target.trainingId, exerciseId, payload);
    close();
  };

  const handleImport = async (templateIds, templatesById) => {
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

  return { target, openAdd, openEdit, close, handleCreate, handleEdit, handleImport, handleAddFromTemplate, handleDelete };
};

export default useExerciseDrawer;
