import { describe, it, expect } from 'vitest';
import {
  sortTechniquesByOrder,
  getTechniqueIds,
  haveSameTechniqueIds,
  toTechniqueRefs,
  stripTechniqueDisplay,
  validateTechniqueForm,
  buildTechniquePayload,
} from './advancedTechniques';
import { DROP_SET, REST_PAUSE } from '../test/advancedTechniqueFixtures';

const VALID = { name: 'Negativa', description: 'Desce lento.', videoUrl: '', gifUrl: '' };

describe('advancedTechniques utils', () => {
  it('sorts by order and tolerates undefined', () => {
    expect(getTechniqueIds(sortTechniquesByOrder([{ id: 'b', order: 1 }, { id: 'a', order: 0 }]))).toEqual(['a', 'b']);
    expect(sortTechniquesByOrder(undefined)).toEqual([]);
  });

  it('compares id lists by order', () => {
    expect(haveSameTechniqueIds([DROP_SET, REST_PAUSE], [DROP_SET, REST_PAUSE])).toBe(true);
    expect(haveSameTechniqueIds([DROP_SET, REST_PAUSE], [REST_PAUSE, DROP_SET])).toBe(false);
    expect(haveSameTechniqueIds([DROP_SET], [])).toBe(false);
  });

  it('builds refs re-indexed to list order', () => {
    expect(toTechniqueRefs([REST_PAUSE, DROP_SET]).map((ref) => [ref.id, ref.order])).toEqual([['tech-rest', 0], ['tech-drop', 1]]);
  });

  it('strips only the display list', () => {
    expect(stripTechniqueDisplay({ name: 'x', advancedTechniques: [], advancedTechniqueIds: ['a'] })).toEqual({ name: 'x', advancedTechniqueIds: ['a'] });
  });

  it('validates required fields, limits and media links', () => {
    expect(validateTechniqueForm(VALID)).toEqual({});
    expect(Object.keys(validateTechniqueForm({ ...VALID, name: ' ', description: '' }))).toEqual(['name', 'description']);
    expect(validateTechniqueForm({ ...VALID, name: 'x'.repeat(81) }).name).toMatch(/80/);
    expect(validateTechniqueForm({ ...VALID, videoUrl: 'abc' }).videoUrl).toBeTruthy();
    expect(validateTechniqueForm({ ...VALID, gifUrl: 'abc' }).gifUrl).toBeTruthy();
  });

  it('omits empty media on create and clears it with null on edit', () => {
    expect(buildTechniquePayload(VALID)).toEqual({ name: 'Negativa', description: 'Desce lento.' });
    expect(buildTechniquePayload(VALID, { isEdit: true })).toEqual({ name: 'Negativa', description: 'Desce lento.', videoUrl: null, gifUrl: null });
  });
});
