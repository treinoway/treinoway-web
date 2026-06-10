import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import useProtocolBuilder from './useProtocolBuilder';

const mockShowToast = vi.fn();

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STUDENT = { id: 'student-1', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' };

const TRAINING_TEMPLATE = {
  id: 'tt-1',
  name: 'Treino Peito',
  category: 'strength',
  bodySegment: 'upper',
  trainingTemplateExerciseTemplates: [
    {
      id: 'junc-1',
      order: 0,
      prescriptionMode: 'reps',
      exerciseTemplate: { id: 'et-1', name: 'Supino', type: 'strength', sets: 4, prescriptionMode: 'reps' },
    },
  ],
};

// Training template whose exercise carries the snapshot fields the bulk endpoint
// must persist verbatim (videoUrl / restInterval / intensity).
const TRAINING_TEMPLATE_FULL = {
  id: 'tt-full',
  name: 'Treino Completo',
  category: 'strength',
  bodySegment: 'upper',
  trainingTemplateExerciseTemplates: [
    {
      id: 'junc-full-1',
      order: 0,
      prescriptionMode: 'reps',
      exerciseTemplate: {
        id: 'et-full-1',
        name: 'Supino Inclinado',
        type: 'strength',
        sets: 4,
        prescriptionMode: 'reps',
        videoUrl: 'https://videos.example.com/supino-inclinado.mp4',
        restInterval: 90,
        intensity: 'rpe8',
      },
    },
  ],
};

const EXERCISE_TEMPLATE = { id: 'et-2', name: 'Agachamento', type: 'strength', sets: 3, prescriptionMode: 'reps' };
const EXERCISE_TEMPLATE_DURATION = { id: 'et-3', name: 'Corrida', type: 'cardio', duration: 600, prescriptionMode: 'duration' };

// Library exercise template carrying the snapshot fields the bulk endpoint must
// persist verbatim when added manually via addExerciseFromTemplate.
const EXERCISE_TEMPLATE_FULL = {
  id: 'et-4',
  name: 'Levantamento Terra',
  type: 'strength',
  sets: 5,
  prescriptionMode: 'reps',
  videoUrl: 'https://videos.example.com/terra.mp4',
  restInterval: 120,
  intensity: 'rpe9',
};

const PROTOCOL_TEMPLATE = {
  id: 'pt-1',
  name: 'Template Força',
  type: 'strength',
  scheduleTemplates: [
    {
      id: 'sched-1',
      weekDay: 'monday',
      trainingTemplate: TRAINING_TEMPLATE,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeGetHandler = (studentId) => (url) => {
  if (url === '/trainer/training-templates') return Promise.resolve({ data: [TRAINING_TEMPLATE, TRAINING_TEMPLATE_FULL] });
  if (url === '/trainer/exercise-templates') return Promise.resolve({ data: [EXERCISE_TEMPLATE, EXERCISE_TEMPLATE_DURATION, EXERCISE_TEMPLATE_FULL] });
  if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [PROTOCOL_TEMPLATE] });
  if (url === '/trainer/students' && studentId) return Promise.resolve({ data: [STUDENT] });
  if (url === `/trainer/protocol-templates/${PROTOCOL_TEMPLATE.id}`) return Promise.resolve({ data: PROTOCOL_TEMPLATE });
  return Promise.resolve({ data: [] });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useProtocolBuilder — mount (no studentId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    expect(result.current.loading).toBe(true);
  });

  it('loads trainingTemplates, exerciseTemplates and protocolTemplates', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trainingTemplates).toHaveLength(2);
    expect(result.current.exerciseTemplates).toHaveLength(3);
    expect(result.current.protocolTemplates).toHaveLength(1);
    expect(result.current.student).toBeNull();
  });
});

describe('useProtocolBuilder — mount with studentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler('student-1'));
  });

  it('loads student and sets assigneeId', async () => {
    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.student).toMatchObject({ id: 'student-1', firstName: 'Ana' });
    expect(result.current.data.assigneeId).toBe('student-1');
  });

  it('student is null when id not found in list', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      return makeGetHandler('student-1')(url);
    });
    const { result } = renderHook(() => useProtocolBuilder('student-unknown'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.student).toBeNull();
  });
});

describe('useProtocolBuilder — createTraining (local only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('adds training to local state without calling POST', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTraining({ name: 'Treino A', category: 'strength' });
    });

    expect(result.current.data.trainings).toHaveLength(1);
    expect(result.current.data.trainings[0].name).toBe('Treino A');
    expect(result.current.data.trainings[0].id).toMatch(/^tmp_/);
    // No POST should have been made
    expect(api.post).not.toHaveBeenCalled();
  });

  it('returned training has id and empty exercises array', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created;
    await act(async () => {
      created = await result.current.createTraining({ name: 'Treino B', category: 'cardio' });
    });

    expect(created.id).toMatch(/^tmp_/);
    expect(result.current.data.trainings[0].exercises).toEqual([]);
  });
});

describe('useProtocolBuilder — importTrainingsFromLibrary (local only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('clones training-template into local state without calling POST', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-1']);
    });

    expect(result.current.data.trainings).toHaveLength(1);
    const t = result.current.data.trainings[0];
    expect(t.name).toBe('Treino Peito');
    expect(t._trainingTemplateId).toBe('tt-1');
    // exercises extracted from junction
    expect(t.exercises).toHaveLength(1);
    expect(t.exercises[0].name).toBe('Supino');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('ignores ids not found in trainingTemplates', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['non-existent-id']);
    });

    expect(result.current.data.trainings).toHaveLength(0);
  });
});

describe('useProtocolBuilder — addExercise / addExerciseFromTemplate (local only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('addExercise appends to training exercises without POST', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      trainingId = t.id;
    });

    await act(async () => {
      await result.current.addExercise(trainingId, {
        name: 'Leg Press', type: 'strength', sets: 3,
      });
    });

    const training = result.current.data.trainings.find((t) => t.id === trainingId);
    expect(training.exercises).toHaveLength(1);
    expect(training.exercises[0].name).toBe('Leg Press');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('addExerciseFromTemplate appends exercise from library without POST', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      trainingId = t.id;
    });

    await act(async () => {
      await result.current.addExerciseFromTemplate(trainingId, 'et-2');
    });

    const training = result.current.data.trainings.find((t) => t.id === trainingId);
    expect(training.exercises).toHaveLength(1);
    expect(training.exercises[0].name).toBe('Agachamento');
    expect(training.exercises[0]._templateId).toBe('et-2');
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('useProtocolBuilder — prescriptionMode handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('extractExercisesFromTemplate maps prescriptionMode from junction', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-1']);
    });

    const exercise = result.current.data.trainings[0].exercises[0];
    expect(exercise.prescriptionMode).toBe('reps');
  });

  it('addExerciseFromTemplate carries prescriptionMode from template in create mode', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino A', category: 'cardio' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-3');
    });

    const exercise = result.current.data.trainings[0].exercises[0];
    expect(exercise.prescriptionMode).toBe('duration');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('addExerciseFromTemplate respects prescriptionMode override in create mode', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-2', { prescriptionMode: 'duration' });
    });

    const exercise = result.current.data.trainings[0].exercises[0];
    expect(exercise.prescriptionMode).toBe('duration');
  });

  it('saveRoutine sends prescriptionMode inline in the bulk payload for a duration template', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-pm', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino Cardio', category: 'cardio' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-3');
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina PM', assigneeId: null, startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    // Single bulk request; the duration template exercise carries its mode + FK inline.
    expect(api.post).toHaveBeenCalledTimes(1);
    const [, payload] = api.post.mock.calls[0];
    const exercise = payload.trainings[0].exercises[0];
    expect(exercise).toMatchObject({
      exerciseTemplateId: 'et-3',
      prescriptionMode: 'duration',
    });
  });
});

describe('useProtocolBuilder — saveRoutine (single bulk request)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler('student-1'));
  });

  it('fires exactly ONE POST to /trainer/protocols/with-trainings with the full nested payload', async () => {
    api.post.mockResolvedValue({
      data: {
        id: 'proto-1',
        trainings: [{ id: 'real-training-1', name: 'Treino A', estimatedDurationSeconds: 600 }],
      },
    });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Build local state
    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      trainingId = t.id;
      await result.current.addExercise(trainingId, { name: 'Supino', type: 'strength', sets: 3 });
    });

    const meta = {
      name: 'Rotina Força',
      assigneeId: 'student-1',
      startDate: '2026-05-01',
    };

    let saved;
    await act(async () => {
      saved = await result.current.saveRoutine(meta, result.current.data.trainings);
    });

    // Exactly one request — the bulk endpoint.
    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/protocols/with-trainings');

    // Protocol header fields
    expect(payload).toMatchObject({
      assigneeId: 'student-1',
      name: 'Rotina Força',
      startDate: '2026-05-01',
    });

    // Nested training (with order)
    expect(payload.trainings).toHaveLength(1);
    expect(payload.trainings[0]).toMatchObject({
      name: 'Treino A',
      category: 'strength',
      order: 0,
    });

    // Nested exercise (with order)
    expect(payload.trainings[0].exercises).toHaveLength(1);
    expect(payload.trainings[0].exercises[0]).toMatchObject({
      name: 'Supino',
      type: 'strength',
      sets: 3,
      order: 0,
    });

    expect(saved.id).toBe('proto-1');
  });

  it('sends template-backed exercises inline with exerciseTemplateId (no from-template call)', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-2', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino B', category: 'strength' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-2');
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina X', assigneeId: 'student-1', startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/protocols/with-trainings');

    const exercise = payload.trainings[0].exercises[0];
    expect(exercise).toMatchObject({
      name: 'Agachamento',
      exerciseTemplateId: 'et-2',
      prescriptionMode: 'reps',
    });
    // No legacy from-template endpoint is ever hit.
    expect(api.post).not.toHaveBeenCalledWith('/trainer/exercises/from-template', expect.anything());
  });

  it('forwards a training library template FK as trainingTemplateId', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-3', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-1']);
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina Lib', assigneeId: 'student-1', startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    const [, payload] = api.post.mock.calls[0];
    expect(payload.trainings[0].trainingTemplateId).toBe('tt-1');
    // Imported exercises keep their template FK too.
    expect(payload.trainings[0].exercises[0].exerciseTemplateId).toBe('et-1');
  });

  it('forwards videoUrl/restInterval/intensity from a training-template exercise into the bulk payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-snapshot', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-full']);
    });

    // Local state captured the snapshot fields from the template junction.
    const localExercise = result.current.data.trainings[0].exercises[0];
    expect(localExercise).toMatchObject({
      videoUrl: 'https://videos.example.com/supino-inclinado.mp4',
      restInterval: 90,
      intensity: 'rpe8',
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina Snapshot', assigneeId: 'student-1', startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    // Single bulk request; the three fields survive into the POST payload.
    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/protocols/with-trainings');

    const exercise = payload.trainings[0].exercises[0];
    expect(exercise).toMatchObject({
      name: 'Supino Inclinado',
      exerciseTemplateId: 'et-full-1',
      videoUrl: 'https://videos.example.com/supino-inclinado.mp4',
      restInterval: 90,
      intensity: 'rpe8',
    });
  });

  it('forwards videoUrl/restInterval/intensity from a library exercise template added via addExerciseFromTemplate into the bulk payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-lib-snapshot', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino Lib', category: 'strength' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-4');
    });

    // Local state captured the snapshot fields from the library template.
    const localExercise = result.current.data.trainings[0].exercises[0];
    expect(localExercise).toMatchObject({
      videoUrl: 'https://videos.example.com/terra.mp4',
      restInterval: 120,
      intensity: 'rpe9',
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina Lib Snapshot', assigneeId: 'student-1', startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    // Single bulk request; the three fields survive into the POST payload.
    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe('/trainer/protocols/with-trainings');

    const exercise = payload.trainings[0].exercises[0];
    expect(exercise).toMatchObject({
      name: 'Levantamento Terra',
      exerciseTemplateId: 'et-4',
      videoUrl: 'https://videos.example.com/terra.mp4',
      restInterval: 120,
      intensity: 'rpe9',
    });
  });

  it('strips frontend-only fields (_isNew, _isFromTemplate, temp ids) from the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-clean', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino Clean', category: 'strength' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-2');
    });

    await act(async () => {
      await result.current.saveRoutine(
        { name: 'Rotina Clean', assigneeId: 'student-1', startDate: '2026-05-01' },
        result.current.data.trainings
      );
    });

    const [, payload] = api.post.mock.calls[0];
    const trainingKeys = Object.keys(payload.trainings[0]);
    expect(trainingKeys).not.toContain('id');
    expect(trainingKeys).not.toContain('_isNew');
    expect(trainingKeys).not.toContain('_isImported');
    expect(trainingKeys).not.toContain('_trainingTemplateId');

    const exerciseKeys = Object.keys(payload.trainings[0].exercises[0]);
    expect(exerciseKeys).not.toContain('id');
    expect(exerciseKeys).not.toContain('_isNew');
    expect(exerciseKeys).not.toContain('_isFromTemplate');
    expect(exerciseKeys).not.toContain('_templateId');
  });

  it('accepts an empty routine (no trainings) and still posts once', async () => {
    api.post.mockResolvedValue({ data: { id: 'proto-empty', trainings: [] } });

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let saved;
    await act(async () => {
      saved = await result.current.saveRoutine(
        { name: 'Rotina Vazia', assigneeId: 'student-1', startDate: '2026-05-01' },
        []
      );
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    const [, payload] = api.post.mock.calls[0];
    expect(payload.trainings).toEqual([]);
    expect(saved.id).toBe('proto-empty');
  });

  it('surfaces the validation error (400) and re-throws without a cleanup call', async () => {
    const apiError = Object.assign(new Error('Validation failed'), {
      userMessage: 'O campo nome é obrigatório.',
    });
    api.post.mockRejectedValue(apiError);

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(
        result.current.saveRoutine(
          { name: '', assigneeId: 'student-1', startDate: '2026-05-01' },
          []
        )
      ).rejects.toThrow();
    });

    expect(result.current.error).toBe('O campo nome é obrigatório.');
    // No multi-step orphan cleanup needed in single-request mode.
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('surfaces a 403 template-not-owned error', async () => {
    const apiError = Object.assign(new Error('Forbidden'), {
      userMessage: 'Um ou mais modelos de exercício não pertencem ao seu perfil.',
    });
    api.post.mockRejectedValue(apiError);

    const { result } = renderHook(() => useProtocolBuilder('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let trainingId;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'Treino', category: 'strength' });
      trainingId = t.id;
      await result.current.addExerciseFromTemplate(trainingId, 'et-2');
    });

    await act(async () => {
      await expect(
        result.current.saveRoutine(
          { name: 'Rotina 403', assigneeId: 'student-1', startDate: '2026-05-01' },
          result.current.data.trainings
        )
      ).rejects.toThrow();
    });

    expect(result.current.error).toBe('Um ou mais modelos de exercício não pertencem ao seu perfil.');
  });
});

describe('useProtocolBuilder — loadFromTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('hydrates trainings from protocol-template', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadFromTemplate(PROTOCOL_TEMPLATE.id);
    });

    expect(result.current.data.trainings).toHaveLength(1);
    const t = result.current.data.trainings[0];
    expect(t.name).toBe('Treino Peito');
    expect(t.weekDay).toBe('monday');
    expect(t.exercises).toHaveLength(1);
    expect(t.exercises[0].name).toBe('Supino');
  });

  it('preserves existing name if already set when importing', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set a name first
    await act(async () => {
      await result.current.updateMeta({ name: 'Minha Rotina' });
    });

    await act(async () => {
      await result.current.loadFromTemplate(PROTOCOL_TEMPLATE.id);
    });

    // name is already set, so it should be preserved (not overwritten by template name)
    expect(result.current.data.name).toBe('Minha Rotina');
  });

  it('sets error and re-throws when API fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === `/trainer/protocol-templates/${PROTOCOL_TEMPLATE.id}`) {
        return Promise.reject(Object.assign(new Error('Not found'), { userMessage: 'Template não encontrado.' }));
      }
      return makeGetHandler(null)(url);
    });

    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.loadFromTemplate(PROTOCOL_TEMPLATE.id)).rejects.toThrow();
    });

    expect(result.current.error).toBe('Template não encontrado.');
  });
});

describe('useProtocolBuilder — updateTrainingWeekDay / deleteTraining / updateExercise / deleteExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('updateTrainingWeekDay updates weekDay locally', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
    });

    act(() => {
      result.current.updateTrainingWeekDay(tid, 'tuesday');
    });

    expect(result.current.data.trainings[0].weekDay).toBe('tuesday');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('deleteTraining removes training from state', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
    });

    act(() => {
      result.current.deleteTraining(tid);
    });

    expect(result.current.data.trainings).toHaveLength(0);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deleteExercise removes exercise from training', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid, eid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
      const ex = await result.current.addExercise(tid, { name: 'Supino', type: 'strength' });
      eid = ex.id;
    });

    await act(async () => {
      await result.current.deleteExercise(tid, eid);
    });

    expect(result.current.data.trainings[0].exercises).toHaveLength(0);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateExercise updates fields locally', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid, eid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
      const ex = await result.current.addExercise(tid, { name: 'Supino', type: 'strength', sets: 3 });
      eid = ex.id;
    });

    await act(async () => {
      await result.current.updateExercise(tid, eid, { sets: 5 });
    });

    expect(result.current.data.trainings[0].exercises[0].sets).toBe(5);
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('useProtocolBuilder — API surface parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeGetHandler(null));
  });

  it('returns all expected fields matching useRoutineBuilder surface', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const keys = Object.keys(result.current);
    const required = [
      'loading', 'saving', 'error', 'data',
      'trainingTemplates', 'exerciseTemplates',
      'createdTrainingIds', 'junctionsAddedToImported',
      'updateMeta', 'saveRoutine', 'createTraining',
      'importTrainingsFromLibrary', 'updateTraining',
      'updateTrainingWeekDay', 'deleteTraining',
      'addExercise', 'addExerciseFromTemplate',
      'updateExercise', 'deleteExercise', 'reorderExercises',
      'saveExerciseAsTemplate', 'restoreSessionTracking',
    ];
    for (const key of required) {
      expect(keys).toContain(key);
    }
  });

  it('createdTrainingIds is always empty (deferred mode)', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.createdTrainingIds).toEqual([]);
  });

  it('restoreSessionTracking is a no-op', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Should not throw
    expect(() => result.current.restoreSessionTracking({ createdTrainingIds: ['a'], junctionsAddedToImported: [] })).not.toThrow();
  });
});

// ─── Edit-mode failure hardening ──────────────────────────────────────────────

const PROTOCOL_ID = 'proto-edit-1';
const EDIT_TRAINING = { id: 'train-edit-1', name: 'Treino Editável', category: 'strength', weekDay: 'monday' };

const makeEditModeGetHandler = () => (url) => {
  if (url === `/trainer/protocols/${PROTOCOL_ID}`)
    return Promise.resolve({
      data: {
        id: PROTOCOL_ID,
        name: 'Protocolo Editável',
        type: 'strength',
        trainingLevel: '',
        genderOrdination: '',
        description: '',
        startDate: '2026-05-01',
        expirationDate: '',
        assigneeId: null,
        trainings: [EDIT_TRAINING],
      },
    });
  if (url === `/trainer/trainings/${EDIT_TRAINING.id}/exercises`)
    return Promise.resolve({ data: [] });
  if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
  if (url === '/trainer/exercise-templates') return Promise.resolve({ data: [] });
  if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
  return Promise.resolve({ data: [] });
};

describe('useProtocolBuilder — edit mode: updateTrainingWeekDay failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeEditModeGetHandler());
  });

  it('reverts weekDay and shows a toast when PATCH fails', async () => {
    const apiError = Object.assign(new Error('Server error'), {
      userMessage: 'Não foi possível salvar o dia da semana.',
    });
    api.patch.mockRejectedValue(apiError);

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Initial weekDay is 'monday' (from fixture)
    expect(result.current.data.trainings[0].weekDay).toBe('monday');

    act(() => {
      result.current.updateTrainingWeekDay(EDIT_TRAINING.id, 'friday');
    });

    // Optimistic update applied immediately
    expect(result.current.data.trainings[0].weekDay).toBe('friday');

    // Wait for the PATCH rejection to be processed
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));

    // weekDay reverted to original value
    expect(result.current.data.trainings[0].weekDay).toBe('monday');
    expect(mockShowToast).toHaveBeenCalledWith('Não foi possível salvar o dia da semana.');
  });

  it('updates weekDay locally in create mode without calling PATCH', async () => {
    // Use create mode (no protocolId) — existing behaviour must be unchanged
    api.get.mockImplementation(makeGetHandler(null));

    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
    });

    act(() => {
      result.current.updateTrainingWeekDay(tid, 'wednesday');
    });

    expect(result.current.data.trainings[0].weekDay).toBe('wednesday');
    expect(api.patch).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('useProtocolBuilder — edit mode: importTrainingsFromLibrary', () => {
  const EDIT_TRAINING_TEMPLATE = {
    id: 'tt-edit-1',
    name: 'Treino Importado',
    category: 'strength',
    bodySegment: 'upper',
    description: 'Descrição do template',
    trainingTemplateExerciseTemplates: [
      {
        id: 'junc-edit-1',
        order: 0,
        exerciseTemplate: { id: 'et-edit-1', name: 'Supino', type: 'strength', sets: 4 },
      },
    ],
  };

  const makeEditModeImportGetHandler = () => (url) => {
    if (url === `/trainer/protocols/${PROTOCOL_ID}`)
      return Promise.resolve({
        data: {
          id: PROTOCOL_ID,
          name: 'Protocolo Editável',
          type: 'strength',
          trainingLevel: '',
          genderOrdination: '',
          description: '',
          startDate: '2026-05-01',
          expirationDate: '',
          assigneeId: null,
          trainings: [],
        },
      });
    if (url === '/trainer/training-templates')
      return Promise.resolve({ data: [EDIT_TRAINING_TEMPLATE] });
    if (url === '/trainer/exercise-templates') return Promise.resolve({ data: [] });
    if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeEditModeImportGetHandler());
  });

  it('uses /trainer/trainings/from-template and preserves exercises returned by the backend', async () => {
    const importedTraining = {
      id: 'real-imported-1',
      name: 'Treino Importado',
      category: 'strength',
      bodySegment: 'upper',
      description: 'Descrição do template',
      weekDay: null,
      exercises: [
        {
          id: 'real-ex-imp-1',
          name: 'Supino',
          type: 'strength',
          sets: 4,
          order: 0,
        },
      ],
    };
    api.post.mockImplementation((url) => {
      if (url === '/trainer/trainings/from-template') {
        return Promise.resolve({ data: importedTraining });
      }
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-edit-1']);
    });

    // Hits the dedicated single-transaction endpoint, NOT the generic create
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/trainer/trainings/from-template', {
      protocolId: PROTOCOL_ID,
      templateId: 'tt-edit-1',
    });

    // Exercises from the backend response survive into local state
    expect(result.current.data.trainings).toHaveLength(1);
    const t = result.current.data.trainings[0];
    expect(t.id).toBe('real-imported-1');
    expect(t.exercises).toHaveLength(1);
    expect(t.exercises[0].name).toBe('Supino');
  });

  it('forwards trainer overrides to the from-template endpoint', async () => {
    api.post.mockResolvedValue({
      data: { id: 'real-imported-2', exercises: [] },
    });

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(
        ['tt-edit-1'],
        { 'tt-edit-1': { weekDay: 'friday', name: 'Custom Name' } }
      );
    });

    expect(api.post).toHaveBeenCalledWith('/trainer/trainings/from-template', {
      protocolId: PROTOCOL_ID,
      templateId: 'tt-edit-1',
      weekDay: 'friday',
      name: 'Custom Name',
    });
  });

  it('defaults exercises to an empty array when the backend omits them', async () => {
    api.post.mockResolvedValue({
      data: { id: 'real-imported-3', name: 'Treino Importado' },
    });

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.importTrainingsFromLibrary(['tt-edit-1']);
    });

    expect(result.current.data.trainings[0].exercises).toEqual([]);
  });
});

describe('useProtocolBuilder — edit mode: deleteTraining failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation(makeEditModeGetHandler());
  });

  it('reverts deletion and shows a toast when DELETE fails', async () => {
    const apiError = Object.assign(new Error('Server error'), {
      userMessage: 'Não foi possível excluir o treino.',
    });
    api.delete.mockRejectedValue(apiError);

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.trainings).toHaveLength(1);

    act(() => {
      result.current.deleteTraining(EDIT_TRAINING.id);
    });

    // Optimistic removal applied immediately
    expect(result.current.data.trainings).toHaveLength(0);

    // Wait for the DELETE rejection to be processed
    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));

    // Training restored at its original position
    expect(result.current.data.trainings).toHaveLength(1);
    expect(result.current.data.trainings[0].id).toBe(EDIT_TRAINING.id);
    expect(mockShowToast).toHaveBeenCalledWith('Não foi possível excluir o treino.');
  });

  it('removes training locally in create mode without calling DELETE', async () => {
    api.get.mockImplementation(makeGetHandler(null));

    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
    });

    act(() => {
      result.current.deleteTraining(tid);
    });

    expect(result.current.data.trainings).toHaveLength(0);
    expect(api.delete).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe('useProtocolBuilder — reorderExercises', () => {
  const REORDER_EXERCISES = [
    { id: 'ex-a', name: 'A' },
    { id: 'ex-b', name: 'B' },
  ];

  const makeReorderEditModeGetHandler = () => (url) => {
    if (url === `/trainer/protocols/${PROTOCOL_ID}`)
      return Promise.resolve({
        data: {
          id: PROTOCOL_ID,
          name: 'Protocolo Editável',
          type: 'strength',
          trainingLevel: '',
          genderOrdination: '',
          description: '',
          startDate: '2026-05-01',
          expirationDate: '',
          assigneeId: null,
          trainings: [EDIT_TRAINING],
        },
      });
    if (url === `/trainer/trainings/${EDIT_TRAINING.id}/exercises`)
      return Promise.resolve({ data: REORDER_EXERCISES });
    if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
    if (url === '/trainer/exercise-templates') return Promise.resolve({ data: [] });
    if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('edit mode (persisted UUID): PATCHes the order endpoint and reorders local state', async () => {
    api.get.mockImplementation(makeReorderEditModeGetHandler());
    api.patch.mockResolvedValue({ data: {} });

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const reordered = [REORDER_EXERCISES[1], REORDER_EXERCISES[0]];
    await act(async () => {
      await result.current.reorderExercises(
        EDIT_TRAINING.id,
        ['ex-b', 'ex-a'],
        reordered
      );
    });

    expect(api.patch).toHaveBeenCalledWith(
      `/trainer/trainings/${EDIT_TRAINING.id}/exercises/order`,
      { exerciseIds: ['ex-b', 'ex-a'] }
    );
    expect(result.current.data.trainings[0].exercises.map((e) => e.id)).toEqual([
      'ex-b',
      'ex-a',
    ]);
  });

  it('edit mode with a temp id: reorders local state and makes NO api call', async () => {
    api.get.mockImplementation(makeReorderEditModeGetHandler());

    const { result } = renderHook(() =>
      useProtocolBuilder(null, { protocolId: PROTOCOL_ID })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Add a draft training with a tmp_ id while in edit mode is not possible via
    // createTraining (it POSTs), so simulate by reordering a synthetic temp id.
    const tempId = 'tmp_abc';
    await act(async () => {
      await result.current.reorderExercises(tempId, ['x'], [{ id: 'x' }]);
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('create mode (draft): reorders local state and makes NO api call', async () => {
    api.get.mockImplementation(makeGetHandler(null));

    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let tid;
    await act(async () => {
      const t = await result.current.createTraining({ name: 'T', category: 'strength' });
      tid = t.id;
      await result.current.addExercise(tid, { id: 'ignored', name: 'A', type: 'strength' });
      await result.current.addExercise(tid, { id: 'ignored', name: 'B', type: 'strength' });
    });

    const created = result.current.data.trainings[0].exercises;
    const reordered = [created[1], created[0]];

    await act(async () => {
      await result.current.reorderExercises(
        tid,
        [created[1].id, created[0].id],
        reordered
      );
    });

    expect(api.patch).not.toHaveBeenCalled();
    expect(result.current.data.trainings[0].exercises).toEqual(reordered);
  });
});
