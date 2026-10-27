import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useRoutineBuilder from './useRoutineBuilder';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

vi.mock('../api/axios');

const DISPLAY = [toRef(DROP_SET, 0), { ...toRef(REST_PAUSE, 1), isDeleted: true }];
const IDS = ['tech-drop', 'tech-rest'];
const ROUTINE = {
  id: 'r1', name: 'Rotina', type: 'strength', trainingLevel: 'intermediate', defaultDurationWeeks: 12, genderOrdination: 'male', description: '',
  trainings: [{ id: 't1', name: 'Treino A', category: 'strength', bodySegment: 'upper', weekDay: 'monday', trainingTemplateExerciseTemplates: [{ id: 'e1', name: 'Supino' }] }],
};

describe('useRoutineBuilder — deleted technique ids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve(url === '/trainer/protocol-templates/r1' ? { data: ROUTINE } : { data: { data: [], total: 0, page: 1, limit: 100 } }));
    api.post.mockResolvedValue({ data: { id: 'e2', name: 'Novo' } });
    api.patch.mockResolvedValue({ data: { id: 'e1', name: 'Supino' } });
  });

  const setup = async () => {
    const hook = renderHook(() => useRoutineBuilder('r1'));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook.result;
  };

  it('addExercise and updateExercise never send deleted ids', async () => {
    const result = await setup();

    await act(async () => {
      await result.current.addExercise('t1', { name: 'Novo', type: 'strength', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
      await result.current.updateExercise('t1', 'e1', { name: 'Supino', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    expect(api.post.mock.calls[0][1].advancedTechniqueIds).toEqual(['tech-drop']);
    expect(api.patch.mock.calls[0][1].advancedTechniqueIds).toEqual(['tech-drop']);
  });
});
