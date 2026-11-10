import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';

// Contract: an uploaded exercise video travels as `videoFileKey` from library/template to local
// builder state and into the bulk-create payload (the endpoint rejects unknown fields, so it is allow-listed).

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const JUNCTION_KEY = 'exercise-videos/trainer-1/junction.mp4';

// Test helper: envelope.
const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

const TEMPLATE_WITH_FILE = { id: 'et-file', name: 'Terra', type: 'strength', sets: 5, prescriptionMode: 'reps', videoFileKey: KEY, videoFileUrl: 'https://cdn.example.com/signed.mp4' };

// Builds a training template with one junction.
const trainingTemplate = (junction) => ({
  id: 'tt-file',
  name: 'Treino com vídeo',
  category: 'strength',
  bodySegment: 'upper',
  trainingTemplateExerciseTemplates: [{ id: 'junc-1', order: 0, prescriptionMode: 'reps', ...junction }],
});

// Test helper: mounts the hook with the given library payloads.
const mountBuilder = async ({ trainingTemplates = [], exerciseTemplates = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/training-templates') return Promise.resolve(envelope(trainingTemplates));
    if (url === '/trainer/exercise-templates') return Promise.resolve(envelope(exerciseTemplates));
    if (url === '/trainer/protocol-templates') return Promise.resolve(envelope([]));
    return Promise.resolve({ data: [] });
  });
  api.post.mockResolvedValue({ data: { id: 'proto-1', trainings: [] } });
  const hook = renderHook(() => useProtocolBuilder(null));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

// Test helper: saves the routine and returns the first bulk exercise.
const saveAndReadExercise = async (result) => {
  await act(async () => {
    await result.current.saveRoutine({ name: 'Rotina', assigneeId: null, startDate: '2026-05-01' }, result.current.data.trainings);
  });
  const [, payload] = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings');
  return payload.trainings[0].exercises[0];
};

describe('useProtocolBuilder — videoFileKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('normalises videoFileKey from the exercise template of an imported training template', async () => {
    const { result } = await mountBuilder({ trainingTemplates: [trainingTemplate({ exerciseTemplate: TEMPLATE_WITH_FILE })] });

    await act(async () => { await result.current.importTrainingsFromLibrary(['tt-file']); });

    expect(result.current.data.trainings[0].exercises[0].videoFileKey).toBe(KEY);
  });

  it('prefers the junction videoFileKey over the exercise template one', async () => {
    const { result } = await mountBuilder({
      trainingTemplates: [trainingTemplate({ videoFileKey: JUNCTION_KEY, exerciseTemplate: TEMPLATE_WITH_FILE })],
    });

    await act(async () => { await result.current.importTrainingsFromLibrary(['tt-file']); });

    expect(result.current.data.trainings[0].exercises[0].videoFileKey).toBe(JUNCTION_KEY);
  });

  it('defaults videoFileKey to null when nothing has an uploaded video', async () => {
    const { result } = await mountBuilder({
      trainingTemplates: [trainingTemplate({ exerciseTemplate: { id: 'et-plain', name: 'Supino', type: 'strength' } })],
    });

    await act(async () => { await result.current.importTrainingsFromLibrary(['tt-file']); });

    expect(result.current.data.trainings[0].exercises[0].videoFileKey).toBeNull();
  });

  it('sends the imported videoFileKey in the bulk-create exercise', async () => {
    const { result } = await mountBuilder({ trainingTemplates: [trainingTemplate({ exerciseTemplate: TEMPLATE_WITH_FILE })] });
    await act(async () => { await result.current.importTrainingsFromLibrary(['tt-file']); });

    const exercise = await saveAndReadExercise(result);

    expect(exercise).toMatchObject({ exerciseTemplateId: 'et-file', videoFileKey: KEY });
  });

  it('copies videoFileKey from a library template added via addExerciseFromTemplate into the bulk payload', async () => {
    const { result } = await mountBuilder({ exerciseTemplates: [TEMPLATE_WITH_FILE] });
    await act(async () => {
      const training = await result.current.createTraining({ name: 'Treino', category: 'strength' });
      await result.current.addExerciseFromTemplate(training.id, 'et-file');
    });

    expect(result.current.data.trainings[0].exercises[0].videoFileKey).toBe(KEY);
    const exercise = await saveAndReadExercise(result);
    expect(exercise.videoFileKey).toBe(KEY);
  });

  it('sends the videoFileKey of a freshly composed exercise in the bulk payload', async () => {
    const { result } = await mountBuilder();
    await act(async () => {
      const training = await result.current.createTraining({ name: 'Treino', category: 'strength' });
      await result.current.addExercise(training.id, { name: 'Supino', type: 'strength', sets: 3, videoFileKey: KEY });
    });

    const exercise = await saveAndReadExercise(result);

    expect(exercise.videoFileKey).toBe(KEY);
  });
});
