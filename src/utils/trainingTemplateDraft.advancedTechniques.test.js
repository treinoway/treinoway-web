import { describe, it, expect } from 'vitest';
import { buildDraftJunction, applyPayloadToDraft, buildTrainingTemplatePayload } from './trainingTemplateDraft';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

// Service: a full training-template PATCH recreates junctions and an omitted key inherits from the
// exercise template, so the web must send advancedTechniqueIds for every junction it knows.

const form = { name: 'T', description: '', category: 'strength', bodySegment: 'upper', isPublic: false, exerciseTemplateIds: ['et-1'] };

describe('trainingTemplateDraft — advancedTechniques (criterion 10, service delta)', () => {
  it('a draft junction snapshots the exercise template techniques', () => {
    const junction = buildDraftJunction({ id: 'et-1', name: 'Supino', type: 'strength', advancedTechniques: [toRef(DROP_SET, 0)] });

    expect(junction.advancedTechniques).toEqual([toRef(DROP_SET, 0)]);
  });

  it('a draft junction defaults to no techniques', () => {
    expect(buildDraftJunction({ id: 'et-1', name: 'Supino', type: 'strength' }).advancedTechniques).toEqual([]);
  });

  it('applyPayloadToDraft carries the edited display list from the composer payload', () => {
    const junction = { exerciseTemplateId: 'et-1', advancedTechniques: [] };

    const updated = applyPayloadToDraft(junction, { advancedTechniques: [toRef(REST_PAUSE, 0)], advancedTechniqueIds: ['tech-rest'] });

    expect(updated.advancedTechniques).toEqual([toRef(REST_PAUSE, 0)]);
  });

  it('always sends advancedTechniqueIds for each junction, ordered by `order`', () => {
    const junctions = [{ exerciseTemplateId: 'et-1', advancedTechniques: [toRef(REST_PAUSE, 1), toRef(DROP_SET, 0)] }];

    const payload = buildTrainingTemplatePayload(form, junctions);

    expect(payload.exerciseTemplates[0].advancedTechniqueIds).toEqual(['tech-drop', 'tech-rest']);
  });

  it('sends [] (not an omitted key) for a junction without techniques', () => {
    const payload = buildTrainingTemplatePayload(form, [{ exerciseTemplateId: 'et-1', advancedTechniques: [] }]);

    expect(payload.exerciseTemplates[0].advancedTechniqueIds).toEqual([]);
  });

  it('never sends the display list to the API', () => {
    const payload = buildTrainingTemplatePayload(form, [{ exerciseTemplateId: 'et-1', advancedTechniques: [toRef(DROP_SET, 0)] }]);

    expect(payload.exerciseTemplates[0]).not.toHaveProperty('advancedTechniques');
  });
});
