import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

const DELETED = { ...toRef(REST_PAUSE, 1), isDeleted: true };
const DISPLAY = [toRef(DROP_SET, 0), DELETED];
// Test helper: envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

const TRAINING_TEMPLATE = {
  id: 'tt-1',
  name: 'Treino',
  category: 'strength',
  trainingTemplateExerciseTemplates: [
    { id: 'j1', order: 0, exerciseTemplate: { id: 'et-1', name: 'Supino', type: 'strength', advancedTechniques: DISPLAY } },
    { id: 'j2', order: 1, advancedTechniques: DISPLAY, exerciseTemplate: { id: 'et-2', name: 'Remada', type: 'strength', advancedTechniques: [] } },
  ],
};

describe('useProtocolBuilder — deleted techniques are never sent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve(envelope([TRAINING_TEMPLATE]));
      return Promise.resolve(envelope([]));
    });
    api.post.mockResolvedValue({ data: { id: 'p1', trainings: [{ id: 'real-1' }] } });
  });

  it('a library-imported junction keeps the deleted ref for display but sends only live ids', async () => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-1']);
    });
    const [, own] = result.current.data.trainings[0].exercises;
    expect(own.advancedTechniques).toEqual(DISPLAY);
    expect(own.advancedTechniqueIds).toEqual(['tech-drop']);

    await act(async () => {
      await result.current.saveRoutine({ name: 'R', assigneeId: 'student-1', startDate: '2026-05-01' }, result.current.data.trainings);
    });

    const exercises = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1].trainings[0].exercises;
    expect(exercises[1].advancedTechniqueIds).toEqual(['tech-drop']);
    expect(exercises[0]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('toBulkExercise filters ids flagged deleted in the display list', async () => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const training = await result.current.createTraining({ name: 'A', category: 'strength' });
      await result.current.addExercise(training.id, { name: 'Supino', type: 'strength', advancedTechniqueIds: ['tech-drop', 'tech-rest'], advancedTechniques: DISPLAY });
    });
    await act(async () => {
      await result.current.saveRoutine({ name: 'R', assigneeId: 'student-1', startDate: '2026-05-01' }, result.current.data.trainings);
    });

    const [exercise] = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1].trainings[0].exercises;
    expect(exercise.advancedTechniqueIds).toEqual(['tech-drop']);
  });
});
