import {
  getExerciseTemplateIds,
  buildFormFromTemplate,
  buildDraftJunction,
  applyPayloadToDraft,
  buildTrainingTemplatePayload,
  normalizeExerciseTemplateIds,
} from './trainingTemplateDraft';

describe('trainingTemplateDraft', () => {
  it('reads ids from exerciseTemplateIds, junction list or exerciseTemplates', () => {
    expect(getExerciseTemplateIds({ exerciseTemplateIds: [1, 2] })).toEqual([1, 2]);
    expect(getExerciseTemplateIds({ trainingTemplateExerciseTemplates: [{ exerciseTemplateId: 'a' }, { exerciseTemplate: { id: 'b' } }] })).toEqual(['a', 'b']);
    expect(getExerciseTemplateIds({ exerciseTemplates: [{ id: 3 }] })).toEqual([3]);
    expect(getExerciseTemplateIds({})).toEqual([]);
  });

  it('normalizes numeric string ids and keeps uuids', () => {
    expect(normalizeExerciseTemplateIds(['20', 21, 'abc-1'])).toEqual([20, 21, 'abc-1']);
  });

  it('builds the form with defaults for missing fields', () => {
    expect(buildFormFromTemplate({ name: 'A' })).toEqual({
      name: 'A', description: '', category: '', bodySegment: '', isPublic: false, exerciseTemplateIds: [],
    });
  });

  it('builds a draft junction without id carrying the exercise snapshot', () => {
    const junction = buildDraftJunction({ id: 5, name: 'Esteira', type: 'cardio' });
    expect(junction).toMatchObject({ exerciseTemplateId: 5, name: 'Esteira', type: 'cardio', prescriptionMode: 'reps', hasLoad: false });
    expect(junction.id).toBeUndefined();
  });

  it('applies only the fields present in the payload', () => {
    const junction = { exerciseTemplateId: 1, sets: 3, notes: 'x' };
    expect(applyPayloadToDraft(junction, { sets: 4 })).toEqual({ exerciseTemplateId: 1, sets: 4, notes: 'x' });
  });

  it('builds the payload with order and overrides, and only order for ids without a junction', () => {
    const payload = buildTrainingTemplatePayload(
      { name: 'T', exerciseTemplateIds: ['20', 21] },
      [{ exerciseTemplateId: 20, sets: 4, name: 'Supino' }],
    );
    expect(payload.name).toBe('T');
    expect(payload.exerciseTemplates[0]).toMatchObject({ exerciseTemplateId: 20, order: 0, sets: 4, name: 'Supino' });
    expect(payload.exerciseTemplates[1]).toEqual({ exerciseTemplateId: 21, order: 1 });
    expect(payload).not.toHaveProperty('exerciseTemplateIds');
  });

  it('carries gifUrl from the exercise template into the draft junction', () => {
    const junction = buildDraftJunction({ id: 5, name: 'Esteira', type: 'cardio', gifUrl: 'https://media.example.com/esteira.gif' });
    expect(junction.gifUrl).toBe('https://media.example.com/esteira.gif');
  });

  it('defaults draft junction gifUrl to null', () => {
    expect(buildDraftJunction({ id: 5, name: 'Esteira', type: 'cardio' }).gifUrl).toBeNull();
  });
});
