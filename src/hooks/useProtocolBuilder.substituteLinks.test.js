import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// AC #29/#30 (biset-substitute-revamp): local substitutes carry template and
// technique links into the bulk payload, and can be edited locally.

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';

// Wraps rows in the paginated list envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

// Mounts the hook in create mode with one training and one principal.
const setupCreate = async () => {
  const { result } = renderHook(() => useProtocolBuilder('student-1'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let training;
  let principal;
  await act(async () => {
    training = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
  });
  await act(async () => {
    principal = await result.current.addExercise(training.id, {
      name: 'Rosca', type: 'strength', sets: 3, repetitions: { min: 10, max: 12 }, restInterval: 45, hasLoad: true,
    });
  });
  return { result, trainingId: training.id, principalId: principal.id };
};

// Returns the substitutes of the first exercise.
const substitutesOf = (result) => result.current.data.trainings[0].exercises[0].substitutes;

// Builds the bulk payload by saving the protocol and reading the POST body.
const savedPayload = async (result) => {
  await act(async () => {
    await result.current.saveRoutine({ name: 'Protocolo', startDate: '2026-05-01' }, result.current.data.trainings);
  });
  const call = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings');
  return call[1];
};

describe('useProtocolBuilder — local substitute links and edit (AC 29, 30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 'student-1' }] });
      return Promise.resolve(envelope([]));
    });
    api.post.mockResolvedValue({ data: { id: 'p1' } });
  });

  it('bulk mapper sends exerciseTemplateId and advancedTechniqueIds on substitutes', async () => {
    const { result, trainingId, principalId } = await setupCreate();
    await act(async () => {
      await result.current.addLocalSubstitute(trainingId, principalId, {
        name: 'Supino reto',
        type: 'strength',
        sets: 4,
        exerciseTemplateId: 'tmpl-supino',
        advancedTechniqueIds: ['tech-drop', 'tech-rest'],
        advancedTechniques: [{ id: 'tech-drop', name: 'Drop set', order: 0 }],
      });
    });

    const payload = await savedPayload(result);

    const [substitute] = payload.trainings[0].exercises[0].substitutes;
    expect(substitute).toMatchObject({
      name: 'Supino reto',
      sets: 4,
      exerciseTemplateId: 'tmpl-supino',
      advancedTechniqueIds: ['tech-drop', 'tech-rest'],
    });
    expect(substitute).not.toHaveProperty('advancedTechniques');
    expect(substitute).not.toHaveProperty('id');
  });

  it('bulk mapper omits the link fields when the substitute has none', async () => {
    const { result, trainingId, principalId } = await setupCreate();
    await act(async () => {
      await result.current.addLocalSubstitute(trainingId, principalId, { name: 'Crucifixo', type: 'strength' });
    });

    const payload = await savedPayload(result);

    const [substitute] = payload.trainings[0].exercises[0].substitutes;
    expect(substitute).not.toHaveProperty('exerciseTemplateId');
    expect(substitute).not.toHaveProperty('advancedTechniqueIds');
  });

  it('updateLocalSubstitute replaces the fields of one substitute in place, keeping id and order', async () => {
    const { result, trainingId, principalId } = await setupCreate();
    let first;
    await act(async () => {
      first = await result.current.addLocalSubstitute(trainingId, principalId, { name: 'Crucifixo', type: 'strength', sets: 3 });
    });
    await act(async () => {
      await result.current.addLocalSubstitute(trainingId, principalId, { name: 'Peck deck', type: 'strength', sets: 3 });
    });

    await act(async () => {
      await result.current.updateLocalSubstitute(trainingId, principalId, first.id, { name: 'Crucifixo inclinado', sets: 5 });
    });

    const [edited, untouched] = substitutesOf(result);
    expect(edited).toMatchObject({ id: first.id, name: 'Crucifixo inclinado', sets: 5, substituteOrder: 0 });
    expect(untouched).toMatchObject({ name: 'Peck deck', sets: 3, substituteOrder: 1 });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('updateLocalSubstitute with an unknown id leaves substitutes unchanged', async () => {
    const { result, trainingId, principalId } = await setupCreate();
    await act(async () => {
      await result.current.addLocalSubstitute(trainingId, principalId, { name: 'Crucifixo', type: 'strength' });
    });

    await act(async () => {
      await result.current.updateLocalSubstitute(trainingId, principalId, 'tmp_missing', { name: 'X' });
    });

    expect(substitutesOf(result)).toHaveLength(1);
    expect(substitutesOf(result)[0].name).toBe('Crucifixo');
  });
});
