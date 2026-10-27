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
import useRoutineBuilder from './useRoutineBuilder';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEMPLATE = {
  id: 'et-1',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
};

const OVERRIDES = {
  template: TEMPLATE,
  prescriptionMode: 'reps',
  sets: 5,
  repetitions: { min: 6, max: 10 },
  restInterval: 120,
  hasLoad: true,
  suggestedLoad: 50,
  notes: 'Pausa no peito',
};

// Backend-style pagination envelope for list endpoints.
const envelope =(data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

// ─── Protocol builder — edit mode (real exercises) ───────────────────────────

describe('useProtocolBuilder.addExerciseFromTemplate — prescription overrides (edit mode)', () => {
  const PROTOCOL_ID = 'proto-1';
  const TRAINING = { id: 'train-1', name: 'Treino', category: 'strength', weekDay: null };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === `/trainer/protocols/${PROTOCOL_ID}`) {
        return Promise.resolve({
          data: {
            id: PROTOCOL_ID, name: 'Protocolo', type: 'strength', trainingLevel: '', genderOrdination: '',
            description: '', startDate: '2026-06-01', expirationDate: '', assigneeId: null, trainings: [TRAINING],
          },
        });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([TEMPLATE]));
      if (url === '/trainer/training-templates') return Promise.resolve(envelope([]));
      if (url === '/trainer/protocol-templates') return Promise.resolve(envelope([]));
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: { id: 'ex-new', name: 'Supino reto', type: 'strength', hasLoad: true } });
  });

  it('POSTs /trainer/exercises/from-template with templateId and every prescription override', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null, { protocolId: PROTOCOL_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addExerciseFromTemplate(TRAINING.id, TEMPLATE.id, OVERRIDES);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/trainer/exercises/from-template',
      expect.objectContaining({
        trainingId: TRAINING.id,
        templateId: TEMPLATE.id,
        prescriptionMode: 'reps',
        sets: 5,
        repetitions: { min: 6, max: 10 },
        restInterval: 120,
        hasLoad: true,
        suggestedLoad: 50,
        notes: 'Pausa no peito',
      })
    );
  });

  it('does not send the resolved template object to the API', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null, { protocolId: PROTOCOL_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addExerciseFromTemplate(TRAINING.id, TEMPLATE.id, OVERRIDES);
    });

    expect(api.post.mock.calls[0][1]).not.toHaveProperty('template');
  });

  it('keeps the plain payload when no overrides are given (library batch import)', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null, { protocolId: PROTOCOL_ID }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addExerciseFromTemplate(TRAINING.id, TEMPLATE.id, { template: TEMPLATE });
    });

    expect(api.post).toHaveBeenCalledWith('/trainer/exercises/from-template', {
      trainingId: TRAINING.id,
      templateId: TEMPLATE.id,
    });
  });
});

// ─── Protocol builder — create mode (local draft) ────────────────────────────

describe('useProtocolBuilder.addExerciseFromTemplate — prescription overrides (create mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([TEMPLATE]));
      if (url === '/trainer/training-templates') return Promise.resolve(envelope([]));
      if (url === '/trainer/protocol-templates') return Promise.resolve(envelope([]));
      return Promise.resolve({ data: [] });
    });
  });

  it('applies the overrides on top of the template in the local exercise, without POST', async () => {
    const { result } = renderHook(() => useProtocolBuilder(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let trainingId;
    await act(async () => {
      const training = await result.current.createTraining({ name: 'Treino A', category: 'strength' });
      trainingId = training.id;
    });

    await act(async () => {
      await result.current.addExerciseFromTemplate(trainingId, TEMPLATE.id, OVERRIDES);
    });

    const [exercise] = result.current.data.trainings.find((t) => t.id === trainingId).exercises;
    expect(exercise).toEqual(
      expect.objectContaining({
        name: 'Supino reto',
        _templateId: TEMPLATE.id,
        sets: 5,
        repetitions: { min: 6, max: 10 },
        restInterval: 120,
        hasLoad: true,
        suggestedLoad: 50,
        notes: 'Pausa no peito',
      })
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ─── Routine (template) builder ──────────────────────────────────────────────

describe('useRoutineBuilder.addExerciseFromTemplate — prescription overrides (template mode)', () => {
  const ROUTINE = {
    id: 'r1',
    name: 'Rotina',
    type: 'strength',
    trainingLevel: 'intermediate',
    defaultDurationWeeks: 12,
    genderOrdination: 'male',
    description: '',
    trainings: [
      { id: 't1', name: 'Treino A', category: 'strength', bodySegment: 'upper', weekDay: 'monday', description: null, trainingTemplateExerciseTemplates: [] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates/r1') return Promise.resolve({ data: ROUTINE });
      if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([TEMPLATE]));
      if (url === '/trainer/training-templates') return Promise.resolve(envelope([]));
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: { id: 'junction-1', name: 'Supino reto' } });
  });

  it('POSTs exerciseTemplateId together with the prescription overrides', async () => {
    const { result } = renderHook(() => useRoutineBuilder('r1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addExerciseFromTemplate('t1', TEMPLATE.id, OVERRIDES);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/trainer/training-templates/t1/exercises/from-template',
      expect.objectContaining({
        exerciseTemplateId: TEMPLATE.id,
        prescriptionMode: 'reps',
        sets: 5,
        repetitions: { min: 6, max: 10 },
        restInterval: 120,
        hasLoad: true,
        suggestedLoad: 50,
        notes: 'Pausa no peito',
      })
    );
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('template');
  });
});
