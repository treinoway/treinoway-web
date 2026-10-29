import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';

// Wraps rows in the paginated list envelope.
const envelope =(data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

// Mounts the hook in create mode with one training and exercises A, B, C.
const setupCreate = async () => {
  const { result } = renderHook(() => useProtocolBuilder('student-1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let training;
  await act(async () => {
    training = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
  });
  const added = [];
  for (const name of ['A', 'B', 'C']) {
    await act(async () => {
      added.push(await result.current.addExercise(training.id, { name, type: 'strength', sets: 3, restInterval: 60 }));
    });
  }
  return { result, trainingId: training.id, ids: added.map((e) => e.id) };
};

// Saves and returns the bulk-create exercises of the first training.
const savedExercises = async (result) => {
  await act(async () => {
    await result.current.saveRoutine({ name: 'Rotina', startDate: '2026-05-01' }, result.current.data.trainings);
  });
  return api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1].trainings[0].exercises;
};

describe('useProtocolBuilder — bi-set order after reorder (create mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 'student-1' }] });
      return Promise.resolve(envelope([]));
    });
    api.post.mockResolvedValue({ data: { id: 'p1' } });
  });

  it('renumbers supersetOrder after members are reordered inside the bi-set', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]]);
    });
    const [a, b, c] = result.current.data.trainings[0].exercises;
    await act(async () => {
      await result.current.reorderExercises(trainingId, [b.id, a.id, c.id], [b, a, c]);
    });

    const list = await savedExercises(result);
    expect(list.map((e) => e.name)).toEqual(['B', 'A', 'C']);
    expect(list.map((e) => e.supersetOrder)).toEqual([0, 1, undefined]);
  });

  it('keeps supersetOrder contiguous when a whole bi-set entry moves past a single', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[1], ids[2]]);
    });
    const [a, b, c] = result.current.data.trainings[0].exercises;
    await act(async () => {
      await result.current.reorderExercises(trainingId, [b.id, c.id, a.id], [b, c, a]);
    });

    const list = await savedExercises(result);
    expect(list.map((e) => e.name)).toEqual(['B', 'C', 'A']);
    expect(list.map((e) => e.supersetOrder)).toEqual([0, 1, undefined]);
  });
});
