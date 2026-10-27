import { describe, it, expect } from 'vitest';
import { buildTrainingTemplatePayload } from './trainingTemplateDraft';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

const form = { name: 'T', description: '', category: 'strength', bodySegment: 'upper', isPublic: false, exerciseTemplateIds: ['et-1'] };

describe('trainingTemplateDraft — deleted techniques', () => {
  it('the full PATCH never sends a deleted technique id of a junction', () => {
    const junctions = [{ exerciseTemplateId: 'et-1', advancedTechniques: [toRef(DROP_SET, 0), { ...toRef(REST_PAUSE, 1), isDeleted: true }] }];

    expect(buildTrainingTemplatePayload(form, junctions).exerciseTemplates[0].advancedTechniqueIds).toEqual(['tech-drop']);
  });

  it('sends [] when the only technique is deleted', () => {
    const junctions = [{ exerciseTemplateId: 'et-1', advancedTechniques: [{ ...toRef(REST_PAUSE, 0), isDeleted: true }] }];

    expect(buildTrainingTemplatePayload(form, junctions).exerciseTemplates[0].advancedTechniqueIds).toEqual([]);
  });
});
