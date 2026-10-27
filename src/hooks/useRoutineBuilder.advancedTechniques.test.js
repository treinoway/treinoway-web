import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useRoutineBuilder from './useRoutineBuilder';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

vi.mock('../api/axios');

const IDS = ['tech-rest', 'tech-drop'];
const DISPLAY = [toRef(REST_PAUSE, 0), toRef(DROP_SET, 1)];
// Test helper: envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

const ROUTINE = {
  id: 'r1',
  name: 'Rotina',
  type: 'strength',
  trainingLevel: 'intermediate',
  defaultDurationWeeks: 12,
  genderOrdination: 'male',
  description: '',
  trainings: [{ id: 't1', name: 'Treino A', category: 'strength', bodySegment: 'upper', weekDay: 'monday', trainingTemplateExerciseTemplates: [{ id: 'e1', name: 'Supino' }] }],
};

// Test helper: setup.
const setup = async () => {
  const hook = renderHook(() => useRoutineBuilder('r1'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook.result;
};

describe('useRoutineBuilder — advancedTechniqueIds on template exercises (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates/r1') return Promise.resolve({ data: ROUTINE });
      return Promise.resolve(envelope([]));
    });
    api.post.mockResolvedValue({ data: { id: 'e2', name: 'Novo', advancedTechniques: DISPLAY } });
    api.patch.mockResolvedValue({ data: { id: 'e1', name: 'Supino', advancedTechniques: DISPLAY } });
  });

  it('POST /exercises sends ids in order and drops the display list', async () => {
    const result = await setup();

    await act(async () => {
      await result.current.addExercise('t1', { name: 'Novo', type: 'strength', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/training-templates/t1/exercises');
    expect(body.advancedTechniqueIds).toEqual(IDS);
    expect(body).not.toHaveProperty('advancedTechniques');
  });

  it('PATCH /exercises/:id sends [] when every technique was removed, without the display list', async () => {
    const result = await setup();

    await act(async () => {
      await result.current.updateExercise('t1', 'e1', { name: 'Supino', advancedTechniqueIds: [], advancedTechniques: [] });
    });

    const [url, body] = api.patch.mock.calls[0];
    expect(url).toBe('/trainer/training-templates/t1/exercises/e1');
    expect(body.advancedTechniqueIds).toEqual([]);
    expect(body).not.toHaveProperty('advancedTechniques');
  });

  it('from-template forwards override ids and drops the display list', async () => {
    const result = await setup();

    await act(async () => {
      await result.current.addExerciseFromTemplate('t1', 'et1', { advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/training-templates/t1/exercises/from-template');
    expect(body).toEqual({ exerciseTemplateId: 'et1', advancedTechniqueIds: IDS });
  });

  it('from-template without overrides sends only exerciseTemplateId (server inherits)', async () => {
    const result = await setup();

    await act(async () => {
      await result.current.addExerciseFromTemplate('t1', 'et1');
    });

    expect(api.post.mock.calls[0][1]).toEqual({ exerciseTemplateId: 'et1' });
  });
});
