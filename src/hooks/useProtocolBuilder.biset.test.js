import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Wraps rows in the paginated list envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

// Builds a local exercise payload.
const exercisePayload = (name, restInterval) => ({
  name,
  type: 'strength',
  sets: 3,
  repetitions: { min: 8, max: 12 },
  restInterval,
  hasLoad: true,
});

// Mounts the hook in create mode with one training and three exercises.
const setupCreate = async () => {
  const { result } = renderHook(() => useProtocolBuilder('student-1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let training;
  await act(async () => {
    training = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
  });
  const added = [];
  for (const [name, rest] of [['Supino', 60], ['Rosca', 45], ['Agacho', 90]]) {
    await act(async () => {
      added.push(await result.current.addExercise(training.id, exercisePayload(name, rest)));
    });
  }
  return { result, trainingId: training.id, ids: added.map((e) => e.id) };
};

// Returns the exercises of the first training.
const exercisesOf = (result) => result.current.data.trainings[0].exercises;

describe('useProtocolBuilder — local bi-sets (create mode, criteria 12-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 'student-1' }] });
      return Promise.resolve(envelope([]));
    });
    api.post.mockResolvedValue({ data: { id: 'p1' } });
  });

  it('createLocalSuperset groups members contiguously, in order, with a client uuid group id', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[2]]);
    });

    const list = exercisesOf(result);
    expect(list.map((e) => e.id)).toEqual([ids[0], ids[2], ids[1]]);
    expect(list[0].supersetGroupId).toMatch(UUID);
    expect(list[1].supersetGroupId).toBe(list[0].supersetGroupId);
    expect([list[0].supersetOrder, list[1].supersetOrder]).toEqual([0, 1]);
    expect(list[2].supersetGroupId ?? null).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('defaults the round rest to the last member rest, or uses the explicit one', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]]);
    });
    expect(exercisesOf(result).slice(0, 2).map((e) => e.supersetRestInterval)).toEqual([45, 45]);

    await act(async () => {
      await result.current.setLocalSupersetRest(trainingId, exercisesOf(result)[0].supersetGroupId, 120);
    });
    expect(exercisesOf(result).slice(0, 2).map((e) => e.supersetRestInterval)).toEqual([120, 120]);
  });

  it('createLocalSuperset honours an explicit restInterval argument', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]], 75);
    });
    expect(exercisesOf(result)[0].supersetRestInterval).toBe(75);
  });

  it('createLocalSuperset rejects fewer than 2 or more than 6 members', async () => {
    const { result, trainingId, ids } = await setupCreate();
    expect(typeof result.current.createLocalSuperset).toBe('function');
    // why: two rejecting act() calls in one test corrupt React's act queue; validation throws before any state update
    await expect(Promise.resolve().then(() => result.current.createLocalSuperset(trainingId, [ids[0]]))).rejects.toThrow();
    await expect(
      Promise.resolve().then(() => result.current.createLocalSuperset(trainingId, Array.from({ length: 7 }, (_, i) => `x${i}`)))
    ).rejects.toThrow();
  });

  it('dissolveLocalSuperset clears the superset fields of every member', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]]);
    });
    const groupId = exercisesOf(result)[0].supersetGroupId;

    await act(async () => {
      await result.current.dissolveLocalSuperset(trainingId, groupId);
    });

    exercisesOf(result).forEach((e) => {
      expect(e.supersetGroupId ?? null).toBeNull();
      expect(e.supersetOrder ?? null).toBeNull();
      expect(e.supersetRestInterval ?? null).toBeNull();
    });
  });

  it('deleting a member of a 2-member bi-set dissolves the group (no 1-member block)', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]]);
    });

    await act(async () => {
      await result.current.deleteExercise(trainingId, ids[0]);
    });

    const remaining = exercisesOf(result).find((e) => e.id === ids[1]);
    expect(remaining.supersetGroupId ?? null).toBeNull();
    expect(remaining.supersetRestInterval ?? null).toBeNull();
  });

  it('deleting a member of a 3-member bi-set keeps the group for the other two', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, ids);
    });
    const groupId = exercisesOf(result)[0].supersetGroupId;

    await act(async () => {
      await result.current.deleteExercise(trainingId, ids[0]);
    });

    const list = exercisesOf(result);
    expect(list).toHaveLength(2);
    list.forEach((e) => expect(e.supersetGroupId).toBe(groupId));
  });

  it('add/removeLocalSubstitute manage nested substitutes with tmp ids', async () => {
    const { result, trainingId, ids } = await setupCreate();
    let sub;
    await act(async () => {
      sub = await result.current.addLocalSubstitute(trainingId, ids[0], { name: 'Crucifixo', type: 'strength', sets: 3 });
    });
    expect(sub.id).toMatch(/^tmp_/);
    expect(exercisesOf(result)[0].substitutes).toEqual([expect.objectContaining({ id: sub.id, name: 'Crucifixo' })]);

    await act(async () => {
      await result.current.removeLocalSubstitute(trainingId, ids[0], sub.id);
    });
    expect(exercisesOf(result)[0].substitutes ?? []).toEqual([]);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('saveRoutine carries superset fields and substitutes in the bulk payload (criterion 16)', async () => {
    const { result, trainingId, ids } = await setupCreate();
    await act(async () => {
      await result.current.createLocalSuperset(trainingId, [ids[0], ids[1]], 90);
    });
    await act(async () => {
      await result.current.addLocalSubstitute(trainingId, ids[2], { name: 'Leg press', type: 'strength', sets: 4, restInterval: 80 });
    });

    await act(async () => {
      await result.current.saveRoutine({ name: 'Rotina', startDate: '2026-05-01' }, result.current.data.trainings);
    });

    const body = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1];
    const [first, second, third] = body.trainings[0].exercises;
    expect(first.supersetGroupId).toMatch(UUID);
    expect(first.supersetGroupId).not.toMatch(/^tmp_/);
    expect(second.supersetGroupId).toBe(first.supersetGroupId);
    expect([first.supersetOrder, second.supersetOrder]).toEqual([0, 1]);
    expect([first.supersetRestInterval, second.supersetRestInterval]).toEqual([90, 90]);
    expect(first).not.toHaveProperty('substitutes');
    expect(third).not.toHaveProperty('supersetGroupId');
    expect(third).not.toHaveProperty('supersetRestInterval');
    expect(third.substitutes).toHaveLength(1);
    expect(third.substitutes[0]).toEqual(expect.objectContaining({ name: 'Leg press', type: 'strength', sets: 4, restInterval: 80 }));
    expect(third.substitutes[0]).not.toHaveProperty('id');
  });
});

describe('useProtocolBuilder — importing templates keeps grouping (criterion 16)', () => {
  const junction = (id, order, name, extra = {}) => ({
    id,
    order,
    sets: 3,
    exerciseTemplate: { id: `et-${id}`, name, type: 'strength' },
    ...extra,
  });
  const GROUPED = [
    junction('j1', 0, 'Supino', { supersetGroupId: 'tpl-g', supersetOrder: 0, supersetRestInterval: 90 }),
    junction('j2', 1, 'Crucifixo', { supersetGroupId: 'tpl-g', supersetOrder: 1, supersetRestInterval: 90 }),
    junction('j3', 2, 'Remada'),
  ];
  const TRAINING_TEMPLATE = { id: 'tt-1', name: 'Treino', category: 'strength', trainingTemplateExerciseTemplates: GROUPED };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve(envelope([TRAINING_TEMPLATE]));
      if (url === '/trainer/protocol-templates/pt-1') {
        return Promise.resolve({ data: { id: 'pt-1', name: 'Proto', scheduleTemplates: [{ weekDay: 'MONDAY', trainingTemplate: TRAINING_TEMPLATE }] } });
      }
      return Promise.resolve(envelope([]));
    });
  });

  const expectGrouped = (exercises) => {
    const [a, b, c] = exercises;
    expect(a.supersetGroupId).toBeTruthy();
    expect(b.supersetGroupId).toBe(a.supersetGroupId);
    expect([a.supersetOrder, b.supersetOrder]).toEqual([0, 1]);
    expect([a.supersetRestInterval, b.supersetRestInterval]).toEqual([90, 90]);
    expect(c.supersetGroupId ?? null).toBeNull();
  };

  it('loadFromTemplate (protocol template) preserves the grouping', async () => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.loadFromTemplate('pt-1');
    });
    expectGrouped(result.current.data.trainings[0].exercises);
  });

  it('importTrainingsFromLibrary (training template) preserves the grouping', async () => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-1']);
    });
    expectGrouped(result.current.data.trainings[0].exercises);
  });
});

describe('useProtocolBuilder — edit mode member delete (criterion 15)', () => {
  const grouped = [
    { id: 'a', name: 'A', order: 0, supersetGroupId: 'g1', supersetOrder: 0, supersetRestInterval: 60 },
    { id: 'b', name: 'B', order: 1, supersetGroupId: 'g1', supersetOrder: 1, supersetRestInterval: 60 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.delete.mockResolvedValue({});
  });

  it('leaves no 1-member bi-set after the server auto-dissolves the group', async () => {
    let deleted = false;
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols/p1') return Promise.resolve({ data: { id: 'p1', trainings: [{ id: 't1', name: 'A' }] } });
      if (url === '/trainer/trainings/t1/exercises') {
        return Promise.resolve({ data: deleted ? [{ id: 'b', name: 'B', order: 0, supersetGroupId: null, supersetOrder: null, supersetRestInterval: null }] : grouped });
      }
      return Promise.resolve(envelope([]));
    });
    api.delete.mockImplementation(() => {
      deleted = true;
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useProtocolBuilder(null, { protocolId: 'p1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteExercise('t1', 'a');
    });

    expect(api.delete).toHaveBeenCalledWith('/trainer/exercises/a');
    const remaining = result.current.data.trainings[0].exercises;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].supersetGroupId ?? null).toBeNull();
  });
});
