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

// Contract: composer payloads carry `advancedTechniqueIds` (sent to the API) and the display-only
// `advancedTechniques` (never sent) so draft/edit state can re-open the drawer pre-filled.

// Test helper: envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });
const DISPLAY = [toRef(REST_PAUSE, 0), toRef(DROP_SET, 1)];
const IDS = ['tech-rest', 'tech-drop'];

const TEMPLATE_WITH_TECHNIQUES = {
  id: 'et-tech',
  name: 'Leg press',
  type: 'strength',
  sets: 3,
  prescriptionMode: 'reps',
  advancedTechniques: [toRef(DROP_SET, 0)],
};

const PROTO_ID = 'proto-at';
const TRAINING = { id: 'train-at', name: 'Treino', category: 'strength', weekDay: null };

// Test helper: getHandler.
const getHandler = (url) => {
  if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([TEMPLATE_WITH_TECHNIQUES]));
  if (url === '/trainer/training-templates' || url === '/trainer/protocol-templates') return Promise.resolve(envelope([]));
  if (url === `/trainer/protocols/${PROTO_ID}`) {
    return Promise.resolve({
      data: { id: PROTO_ID, name: 'P', type: 'strength', trainingLevel: '', genderOrdination: '', description: '', startDate: '2026-06-01', expirationDate: '', assigneeId: null, trainings: [TRAINING] },
    });
  }
  if (url === `/trainer/trainings/${TRAINING.id}/exercises`) {
    return Promise.resolve({ data: [{ id: 'ex-1', name: 'Supino', type: 'strength', advancedTechniques: DISPLAY }] });
  }
  return Promise.resolve({ data: [] });
};

// Test helper: bulkExercises.
const bulkExercises = () => api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1].trainings[0].exercises;

describe('useProtocolBuilder — advancedTechniqueIds in a new protocol (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation(getHandler);
    api.post.mockResolvedValue({ data: { id: 'p1', trainings: [{ id: 'real-1' }] } });
  });

  const buildDraft = async (build) => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const training = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      await build(result.current, training.id);
    });
    await act(async () => {
      await result.current.saveRoutine({ name: 'R', assigneeId: 'student-1', startDate: '2026-05-01' }, result.current.data.trainings);
    });
    return result;
  };

  it('toBulkExercise keeps advancedTechniqueIds in order and drops the display list', async () => {
    await buildDraft((hook, trainingId) =>
      hook.addExercise(trainingId, { name: 'Supino', type: 'strength', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY }));

    const [exercise] = bulkExercises();
    expect(exercise.advancedTechniqueIds).toEqual(IDS);
    expect(exercise).not.toHaveProperty('advancedTechniques');
  });

  it('omits the key when the exercise has no techniques selection', async () => {
    await buildDraft((hook, trainingId) => hook.addExercise(trainingId, { name: 'Supino', type: 'strength' }));

    expect(bulkExercises()[0]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('keeps the draft display list for re-opening the drawer', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let trainingId;
    await act(async () => {
      trainingId = (await result.current.createTraining({ name: 'A', category: 'strength' })).id;
      await result.current.addExercise(trainingId, { name: 'Supino', type: 'strength', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    expect(result.current.data.trainings[0].exercises[0].advancedTechniques).toEqual(DISPLAY);
  });

  it('from-template with overrides sends the override ids (including []) and exerciseTemplateId', async () => {
    await buildDraft(async (hook, trainingId) => {
      await hook.addExerciseFromTemplate(trainingId, 'et-tech', { template: TEMPLATE_WITH_TECHNIQUES, advancedTechniqueIds: [], advancedTechniques: [] });
    });

    const [exercise] = bulkExercises();
    expect(exercise.exerciseTemplateId).toBe('et-tech');
    expect(exercise.advancedTechniqueIds).toEqual([]);
  });

  it('from-template without overrides omits the key so the server inherits, but displays the inherited techniques', async () => {
    const result = await buildDraft(async (hook, trainingId) => {
      await hook.addExerciseFromTemplate(trainingId, 'et-tech', { template: TEMPLATE_WITH_TECHNIQUES });
    });

    expect(bulkExercises()[0]).not.toHaveProperty('advancedTechniqueIds');
    expect(result.current.data.trainings[0].exercises[0].advancedTechniques).toEqual(TEMPLATE_WITH_TECHNIQUES.advancedTechniques);
  });
});

describe('useProtocolBuilder — advancedTechniqueIds in edit mode (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation(getHandler);
  });

  const renderEdit = async () => {
    const hook = renderHook(() => useProtocolBuilder(null, { protocolId: PROTO_ID }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook.result;
  };

  it('POST /trainer/trainings/:id/exercises sends ids and not the display list', async () => {
    api.post.mockResolvedValue({ data: { id: 'ex-new', name: 'Novo', advancedTechniques: DISPLAY } });
    const result = await renderEdit();

    await act(async () => {
      await result.current.addExercise(TRAINING.id, { name: 'Novo', type: 'strength', advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe(`/trainer/trainings/${TRAINING.id}/exercises`);
    expect(body.advancedTechniqueIds).toEqual(IDS);
    expect(body).not.toHaveProperty('advancedTechniques');
  });

  it('PATCH /trainer/exercises/:id sends [] when cleared, never the display list, and updates local state', async () => {
    api.patch.mockResolvedValue({ data: {} });
    const result = await renderEdit();

    await act(async () => {
      await result.current.updateExercise(TRAINING.id, 'ex-1', { name: 'Supino', advancedTechniqueIds: [], advancedTechniques: [] });
    });

    const [url, body] = api.patch.mock.calls[0];
    expect(url).toBe('/trainer/exercises/ex-1');
    expect(body.advancedTechniqueIds).toEqual([]);
    expect(body).not.toHaveProperty('advancedTechniques');
    expect(result.current.data.trainings[0].exercises[0].advancedTechniques).toEqual([]);
  });

  it('PATCH sends the reordered ids', async () => {
    api.patch.mockResolvedValue({ data: {} });
    const result = await renderEdit();

    await act(async () => {
      await result.current.updateExercise(TRAINING.id, 'ex-1', { advancedTechniqueIds: ['tech-drop', 'tech-rest'], advancedTechniques: [toRef(DROP_SET, 0), toRef(REST_PAUSE, 1)] });
    });

    expect(api.patch.mock.calls[0][1].advancedTechniqueIds).toEqual(['tech-drop', 'tech-rest']);
  });

  it('POST /trainer/exercises/from-template forwards override ids and drops the display list', async () => {
    api.post.mockResolvedValue({ data: { id: 'ex-ft', name: 'Leg press', type: 'strength', hasLoad: true } });
    const result = await renderEdit();

    await act(async () => {
      await result.current.addExerciseFromTemplate(TRAINING.id, 'et-tech', { advancedTechniqueIds: IDS, advancedTechniques: DISPLAY });
    });

    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/exercises/from-template');
    expect(body.advancedTechniqueIds).toEqual(IDS);
    expect(body).not.toHaveProperty('advancedTechniques');
  });

  it('from-template without overrides sends no advancedTechniqueIds key', async () => {
    api.post.mockResolvedValue({ data: { id: 'ex-ft', name: 'Leg press', type: 'strength', hasLoad: true } });
    const result = await renderEdit();

    await act(async () => {
      await result.current.addExerciseFromTemplate(TRAINING.id, 'et-tech');
    });

    expect(api.post.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });
});
