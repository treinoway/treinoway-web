import { describe, it, expect } from 'vitest';
import { toTechniqueIds, withoutDeletedTechniques, getLiveTechniqueIds, stripTechniqueDisplay, toTechniqueRefs } from './advancedTechniques';
import { DROP_SET, REST_PAUSE, CLUSTER_SET } from '../test/advancedTechniqueFixtures';

const DELETED = { ...REST_PAUSE, isDeleted: true };

describe('advancedTechniques — deleted refs', () => {
  it('toTechniqueIds keeps order and skips deleted', () => {
    expect(toTechniqueIds([CLUSTER_SET, DELETED, DROP_SET])).toEqual(['tech-cluster', 'tech-drop']);
    expect(toTechniqueIds(undefined)).toEqual([]);
  });

  it('withoutDeletedTechniques filters on isDeleted', () => {
    expect(withoutDeletedTechniques([DROP_SET, DELETED])).toEqual([DROP_SET]);
  });

  it('getLiveTechniqueIds drops ids flagged deleted in the display list', () => {
    const exercise = { advancedTechniqueIds: ['tech-drop', 'tech-rest'], advancedTechniques: [DROP_SET, DELETED] };
    expect(getLiveTechniqueIds(exercise)).toEqual(['tech-drop']);
  });

  it('stripTechniqueDisplay removes the display list and deleted ids', () => {
    const body = stripTechniqueDisplay({ name: 'x', advancedTechniqueIds: ['tech-drop', 'tech-rest'], advancedTechniques: [DROP_SET, DELETED] });
    expect(body).toEqual({ name: 'x', advancedTechniqueIds: ['tech-drop'] });
  });

  it('toTechniqueRefs carries isDeleted (false by default)', () => {
    expect(toTechniqueRefs([DROP_SET, DELETED]).map((ref) => ref.isDeleted)).toEqual([false, true]);
  });
});
