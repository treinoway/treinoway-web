import { buildDraftJunction, buildTrainingTemplatePayload } from './trainingTemplateDraft';

describe('trainingTemplateDraft — videoFileKey', () => {
  it('carries videoFileKey from the exercise template into the draft junction', () => {
    const junction = buildDraftJunction({ id: 5, name: 'Esteira', type: 'cardio', videoFileKey: 'exercise-videos/t1/a.mp4' });
    expect(junction.videoFileKey).toBe('exercise-videos/t1/a.mp4');
  });

  it('defaults the draft junction videoFileKey to null', () => {
    expect(buildDraftJunction({ id: 5, name: 'Esteira', type: 'cardio' }).videoFileKey).toBeNull();
  });

  it('sends videoFileKey as a junction override in the payload', () => {
    const payload = buildTrainingTemplatePayload(
      { name: 'T', exerciseTemplateIds: [20] },
      [{ exerciseTemplateId: 20, videoFileKey: 'exercise-videos/t1/a.mp4' }],
    );
    expect(payload.exerciseTemplates[0]).toMatchObject({ exerciseTemplateId: 20, videoFileKey: 'exercise-videos/t1/a.mp4' });
  });
});
