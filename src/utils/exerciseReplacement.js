export const buildPreservedExerciseFields = (ex) => {
  const hasLoad = ex.hasLoad ?? ex.exerciseTemplate?.hasLoad ?? false;
  const prescriptionMode = ex.prescriptionMode ?? ex.exerciseTemplate?.prescriptionMode ?? 'reps';
  return {
    sets: ex.sets ?? null,
    prescriptionMode,
    repetitions:
      prescriptionMode === 'duration'
        ? null
        : ex.repetitions ?? ex.exerciseTemplate?.repetitions ?? null,
    duration:
      prescriptionMode === 'duration'
        ? ex.duration ?? ex.exerciseTemplate?.duration ?? null
        : null,
    hasLoad,
    suggestedLoad: hasLoad
      ? ex.suggestedLoad ?? ex.exerciseTemplate?.suggestedLoad ?? null
      : null,
    restInterval: ex.restInterval ?? ex.exerciseTemplate?.restInterval ?? null,
    notes: ex.notes || ex.exerciseTemplate?.notes || '',
  };
};

const createAndConfigureReplacement = async ({
  trainingId,
  templateId,
  preservedFields,
  addExerciseFromTemplate,
  updateExercise,
  deleteExercise,
}) => {
  const created = await addExerciseFromTemplate(trainingId, templateId);
  try {
    await updateExercise(trainingId, created.id, preservedFields);
  } catch (err) {
    await deleteExercise(trainingId, created.id).catch(() => {});
    throw err;
  }
  return { ...created, ...preservedFields };
};

export const replaceExerciseFromTemplate = async ({
  trainingId,
  exerciseId,
  templateId,
  exercises,
  addExerciseFromTemplate,
  updateExercise,
  deleteExercise,
  reorderExercises,
  fieldsPayload,
}) => {
  const oldIndex = exercises.findIndex((ex) => ex.id === exerciseId);
  if (oldIndex === -1) throw new Error('Exercício não encontrado.');

  const preservedFields = fieldsPayload ?? buildPreservedExerciseFields(exercises[oldIndex]);
  const mergedExercise = await createAndConfigureReplacement({
    trainingId,
    templateId,
    preservedFields,
    addExerciseFromTemplate,
    updateExercise,
    deleteExercise,
  });

  try {
    await deleteExercise(trainingId, exerciseId);
  } catch {
    const incompleteError = new Error('Substituição incompleta.');
    incompleteError.userMessage =
      'O novo exercício foi criado, mas o antigo não pôde ser removido. Revise a lista e remova manualmente o exercício duplicado.';
    incompleteError.isReplaceIncomplete = true;
    throw incompleteError;
  }

  const finalExercises = [
    ...exercises.slice(0, oldIndex),
    mergedExercise,
    ...exercises.slice(oldIndex + 1),
  ];
  await reorderExercises(trainingId, finalExercises.map((ex) => ex.id), finalExercises);
  return mergedExercise;
};
