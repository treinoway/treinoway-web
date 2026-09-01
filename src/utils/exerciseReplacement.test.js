import { describe, it, expect, vi } from 'vitest';
import { buildPreservedExerciseFields, replaceExerciseFromTemplate } from './exerciseReplacement';

describe('buildPreservedExerciseFields', () => {
  it('extracts flat prescription fields from a fully-populated reps-mode exercise', () => {
    const ex = {
      sets: 4,
      prescriptionMode: 'reps',
      repetitions: { min: 8, max: 12 },
      hasLoad: true,
      suggestedLoad: 40,
      restInterval: 90,
      notes: 'Foco em execução lenta',
    };
    expect(buildPreservedExerciseFields(ex)).toEqual({
      sets: 4,
      prescriptionMode: 'reps',
      repetitions: { min: 8, max: 12 },
      duration: null,
      hasLoad: true,
      suggestedLoad: 40,
      restInterval: 90,
      notes: 'Foco em execução lenta',
    });
  });

  it('preserves duration instead of repetitions for a duration-mode exercise', () => {
    const ex = {
      sets: 3,
      prescriptionMode: 'duration',
      duration: 60,
      repetitions: { min: 8, max: 12 },
      hasLoad: false,
      restInterval: 30,
      notes: '',
    };
    expect(buildPreservedExerciseFields(ex)).toEqual({
      sets: 3,
      prescriptionMode: 'duration',
      repetitions: null,
      duration: 60,
      hasLoad: false,
      suggestedLoad: null,
      restInterval: 30,
      notes: '',
    });
  });

  it('nulls suggestedLoad when hasLoad is false, even if the value is present', () => {
    const ex = { hasLoad: false, suggestedLoad: 40 };
    expect(buildPreservedExerciseFields(ex).suggestedLoad).toBeNull();
  });

  it('falls back to the nested exerciseTemplate snapshot when flat fields are absent', () => {
    const ex = {
      exerciseTemplate: {
        repetitions: { min: 10, max: 15 },
        hasLoad: true,
        suggestedLoad: 20,
        restInterval: 60,
        notes: 'Nota do template',
      },
    };
    expect(buildPreservedExerciseFields(ex)).toEqual({
      sets: null,
      prescriptionMode: 'reps',
      repetitions: { min: 10, max: 15 },
      duration: null,
      hasLoad: true,
      suggestedLoad: 20,
      restInterval: 60,
      notes: 'Nota do template',
    });
  });

  it('defaults to null/false/empty when nothing is set', () => {
    expect(buildPreservedExerciseFields({})).toEqual({
      sets: null,
      prescriptionMode: 'reps',
      repetitions: null,
      duration: null,
      hasLoad: false,
      suggestedLoad: null,
      restInterval: null,
      notes: '',
    });
  });
});

const OLD_EXERCISE = {
  id: 'ex-old',
  name: 'Supino reto',
  sets: 4,
  prescriptionMode: 'reps',
  repetitions: { min: 8, max: 12 },
  hasLoad: true,
  suggestedLoad: 40,
  restInterval: 90,
  notes: 'Cadência 2-0-2',
};
const OTHER_EXERCISE = { id: 'ex-other', name: 'Puxada' };
const NEW_EXERCISE = { id: 'ex-new', name: 'Supino inclinado' };

const buildMocks = (overrides = {}) => ({
  addExerciseFromTemplate: vi.fn().mockResolvedValue(NEW_EXERCISE),
  updateExercise: vi.fn().mockResolvedValue(undefined),
  deleteExercise: vi.fn().mockResolvedValue(undefined),
  reorderExercises: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('replaceExerciseFromTemplate', () => {
  it('creates, patches with preserved fields, deletes the old exercise, then reorders into the old slot', async () => {
    const mocks = buildMocks();
    const exercises = [OTHER_EXERCISE, OLD_EXERCISE];

    const result = await replaceExerciseFromTemplate({
      trainingId: 't1',
      exerciseId: 'ex-old',
      templateId: 'tmpl-1',
      exercises,
      ...mocks,
    });

    expect(mocks.addExerciseFromTemplate).toHaveBeenCalledWith('t1', 'tmpl-1');
    expect(mocks.updateExercise).toHaveBeenCalledWith('t1', 'ex-new', {
      sets: 4,
      prescriptionMode: 'reps',
      repetitions: { min: 8, max: 12 },
      duration: null,
      hasLoad: true,
      suggestedLoad: 40,
      restInterval: 90,
      notes: 'Cadência 2-0-2',
    });
    expect(mocks.deleteExercise).toHaveBeenCalledWith('t1', 'ex-old');

    const [, orderedIds, orderedExercises] = mocks.reorderExercises.mock.calls[0];
    expect(orderedIds).toEqual(['ex-other', 'ex-new']);
    expect(orderedExercises.map((ex) => ex.id)).toEqual(['ex-other', 'ex-new']);

    expect(result).toMatchObject({ id: 'ex-new', sets: 4, restInterval: 90 });
  });

  it('rolls back (deletes the new exercise) and rethrows when the patch step fails, leaving the old exercise untouched', async () => {
    const patchError = new Error('Falha ao salvar');
    const mocks = buildMocks({
      updateExercise: vi.fn().mockRejectedValue(patchError),
    });

    await expect(
      replaceExerciseFromTemplate({
        trainingId: 't1',
        exerciseId: 'ex-old',
        templateId: 'tmpl-1',
        exercises: [OLD_EXERCISE],
        ...mocks,
      })
    ).rejects.toThrow('Falha ao salvar');

    expect(mocks.deleteExercise).toHaveBeenCalledWith('t1', 'ex-new');
    expect(mocks.deleteExercise).not.toHaveBeenCalledWith('t1', 'ex-old');
    expect(mocks.reorderExercises).not.toHaveBeenCalled();
  });

  it('surfaces a clear "incomplete" error when deleting the old exercise fails after creation succeeded', async () => {
    const mocks = buildMocks({
      deleteExercise: vi.fn().mockRejectedValue(new Error('boom')),
    });

    let caught;
    try {
      await replaceExerciseFromTemplate({
        trainingId: 't1',
        exerciseId: 'ex-old',
        templateId: 'tmpl-1',
        exercises: [OLD_EXERCISE],
        ...mocks,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.isReplaceIncomplete).toBe(true);
    expect(caught.userMessage).toMatch(/revise a lista/i);
    expect(mocks.deleteExercise).toHaveBeenCalledTimes(1);
    expect(mocks.reorderExercises).not.toHaveBeenCalled();
  });

  it('throws when the exercise to replace is not found in the given list', async () => {
    const mocks = buildMocks();
    await expect(
      replaceExerciseFromTemplate({
        trainingId: 't1',
        exerciseId: 'does-not-exist',
        templateId: 'tmpl-1',
        exercises: [OLD_EXERCISE],
        ...mocks,
      })
    ).rejects.toThrow();
    expect(mocks.addExerciseFromTemplate).not.toHaveBeenCalled();
  });

  it('patches with the given fieldsPayload instead of the fields computed from the old exercise', async () => {
    const mocks = buildMocks();
    const fieldsPayload = {
      sets: 6,
      prescriptionMode: 'reps',
      repetitions: { min: 5, max: 5 },
      duration: null,
      hasLoad: false,
      suggestedLoad: null,
      restInterval: 120,
      notes: 'Editado antes de salvar',
    };

    const result = await replaceExerciseFromTemplate({
      trainingId: 't1',
      exerciseId: 'ex-old',
      templateId: 'tmpl-1',
      exercises: [OLD_EXERCISE],
      fieldsPayload,
      ...mocks,
    });

    expect(mocks.updateExercise).toHaveBeenCalledWith('t1', 'ex-new', fieldsPayload);
    expect(result).toMatchObject({ id: 'ex-new', sets: 6, notes: 'Editado antes de salvar' });
  });
});
