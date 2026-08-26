// ─── exerciseReplacement ────────────────────────────────────────────────────
//
// Shared orchestration for the "Substituir exercício" feature (RoutineBuilder).
// There is no atomic backend endpoint for swapping an exercise's identity
// while keeping its prescription — the client stitches it together from three
// existing primitives (create-from-template, patch, delete) plus a local
// reorder. Both useRoutineBuilder (template mode) and useProtocolBuilder
// (protocol mode) already expose those primitives with slightly different
// internal persistence rules (eager vs. local-draft); this module is
// mode-agnostic — it only calls whatever functions it is handed.

/**
 * Extracts the prescription/configuration fields to preserve when an
 * exercise's identity (name/type/video/exerciseTemplateId) is swapped for a
 * different library template. Falls back to the nested `exerciseTemplate`
 * snapshot for junction rows that carry no flat prescription fields of their
 * own — the same fallback pattern used by ExerciseRow/ExerciseComposer.
 *
 * @param {object} ex - The exercise being replaced.
 * @returns {{sets: number|null, prescriptionMode: string, repetitions: object|null,
 *   duration: number|null, hasLoad: boolean, suggestedLoad: number|null,
 *   restInterval: number|null, notes: string}}
 */
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

/**
 * Creates the replacement exercise from a template and immediately patches it
 * with the preserved prescription fields. If the patch fails, rolls back by
 * deleting the newly created exercise — the OLD exercise is never touched at
 * this stage.
 */
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

/**
 * Orchestrates the full client-side "replace exercise" flow:
 *   1. Create the new exercise from the chosen template.
 *   2. Patch it with the old exercise's prescription (rollback on failure).
 *   3. Delete the old exercise (only once 1+2 succeeded).
 *   4. Reorder the training's exercise list so the new exercise occupies the
 *      old exercise's position.
 *
 * If step 3 fails, both exercises remain visible and a clear "incomplete"
 * error is thrown for the caller to surface — no further recovery is
 * attempted.
 *
 * @param {object} params
 * @param {string} params.trainingId
 * @param {string} params.exerciseId - The exercise being replaced.
 * @param {string} params.templateId - The library template to replace it with.
 * @param {object[]} params.exercises - Current exercises for this training, in order.
 * @param {Function} params.addExerciseFromTemplate
 * @param {Function} params.updateExercise
 * @param {Function} params.deleteExercise
 * @param {Function} params.reorderExercises
 * @returns {Promise<object>} The new exercise (merged with preserved fields).
 */
export const replaceExerciseFromTemplate = async ({
  trainingId,
  exerciseId,
  templateId,
  exercises,
  addExerciseFromTemplate,
  updateExercise,
  deleteExercise,
  reorderExercises,
}) => {
  const oldIndex = exercises.findIndex((ex) => ex.id === exerciseId);
  if (oldIndex === -1) throw new Error('Exercício não encontrado.');

  const preservedFields = buildPreservedExerciseFields(exercises[oldIndex]);
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
