import { describe, it, expect } from 'vitest';
import { buildSubstituteFromTemplate, toSubstituteApiBody } from './substituteBody';

const TEMPLATE = { id: 't1', name: 'Supino', type: 'strength', sets: 4, restInterval: 90, videoUrl: 'https://v' };

describe('buildSubstituteFromTemplate', () => {
  it('links the template, drops the template object and keeps the edits', () => {
    const body = buildSubstituteFromTemplate(TEMPLATE, { template: TEMPLATE, sets: 5 }, { local: false });

    expect(body).toEqual({ exerciseTemplateId: 't1', name: 'Supino', type: 'strength', sets: 5 });
  });

  it('local bodies start from the template defaults so the draft row is complete', () => {
    const body = buildSubstituteFromTemplate(TEMPLATE, { sets: 5 }, { local: true });

    expect(body).toMatchObject({ exerciseTemplateId: 't1', sets: 5, restInterval: 90, videoUrl: 'https://v' });
  });
});

describe('toSubstituteApiBody', () => {
  it('drops the display-only technique list', () => {
    const body = toSubstituteApiBody({ name: 'X', advancedTechniques: [{ id: 'a' }], advancedTechniqueIds: ['a'] });

    expect(body).not.toHaveProperty('advancedTechniques');
    expect(body.advancedTechniqueIds).toEqual(['a']);
  });
});
