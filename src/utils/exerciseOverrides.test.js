import { describe, it, expect } from 'vitest';
import { toApiOverrides } from './exerciseOverrides';

describe('toApiOverrides', () => {
  it('removes the template object and undefined values, keeping the rest', () => {
    expect(toApiOverrides({ template: { id: 't' }, sets: 5, notes: undefined, hasLoad: false })).toEqual({
      sets: 5,
      hasLoad: false,
    });
  });

  it('returns an empty object for no overrides', () => {
    expect(toApiOverrides()).toEqual({});
    expect(toApiOverrides({ template: { id: 't' } })).toEqual({});
  });

  it('drops the display advancedTechniques list but keeps advancedTechniqueIds', () => {
    expect(
      toApiOverrides({ advancedTechniques: [{ id: 't1' }], advancedTechniqueIds: ['t1'], sets: 3 }),
    ).toEqual({ advancedTechniqueIds: ['t1'], sets: 3 });
  });
});
