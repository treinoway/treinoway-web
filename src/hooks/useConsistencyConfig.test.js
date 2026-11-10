import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import api from '../api/axios';
import useConsistencyConfig from './useConsistencyConfig';

const CONFIG_URL = '/trainer/consistency-ranking/config';

// Saved configuration as the service returns it
const savedConfig = () => ({
  weights: { workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 },
  activePillars: ['workouts', 'cardio', 'feedback', 'hydration'],
  closeWeekday: 0,
  closeHour: 21,
  timeZone: 'America/Sao_Paulo',
  seasonWeeks: 4,
  minPodiumWeeks: 3,
  minWorkoutMinutes: 15,
  riskLimit: 60,
  riskWeeks: 3,
  batchCount: 8,
  batchMinutes: 45,
});

// Renders the hook and waits for the configuration to load
const renderLoaded = async () => {
  const hook = renderHook(() => useConsistencyConfig());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe('useConsistencyConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: savedConfig() });
    api.put.mockResolvedValue({ data: { ...savedConfig(), effectiveFrom: '2026-11-16' } });
  });

  it('loads the saved configuration, starting in loading and not dirty', async () => {
    const { result } = renderHook(() => useConsistencyConfig());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(CONFIG_URL);
    expect(result.current.config).toEqual(savedConfig());
    expect(result.current.weightSum).toBe(100);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes the API error message when loading fails', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Falha ao carregar' });
    const { result } = renderHook(() => useConsistencyConfig());

    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar'));
    expect(result.current.config).toBeNull();
  });

  it('PAN-39 blocks saving when weights do not sum to 100', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setWeight('cardio', 20));

    expect(result.current.weightSum).toBe(105);
    expect(result.current.canSave).toBe(false);

    act(() => result.current.setWeight('workouts', 25));

    expect(result.current.weightSum).toBe(100);
    expect(result.current.canSave).toBe(true);
  });

  it('PAN-42 restores defaults without saving', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.restoreDefaults());

    expect(result.current.config).toMatchObject({
      weights: { workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 },
      seasonWeeks: 4,
      minPodiumWeeks: 2,
      closeWeekday: 0,
      closeHour: 21,
      minWorkoutMinutes: 10,
      riskLimit: 70,
      riskWeeks: 2,
      batchCount: 5,
      batchMinutes: 30,
      timeZone: 'America/Sao_Paulo',
    });
    expect(api.put).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
  });

  it('PAN-44 flags unsaved changes until they are saved', async () => {
    const { result } = await renderLoaded();
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setWeight('cardio', 20));
    act(() => result.current.setWeight('workouts', 25));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('saves only the changed fields and exposes the date the new rule takes effect', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setWeight('cardio', 20));
    act(() => result.current.setWeight('workouts', 25));

    await act(async () => {
      await result.current.save();
    });

    expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { weights: { workouts: 25, diet: 30, cardio: 20, feedback: 15, hydration: 10 } });
    expect(result.current.effectiveFrom).toBe('2026-11-16');
  });

  it('turns a pillar on and off without touching its weight', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setPillarActive('diet', true));
    expect(result.current.config.activePillars).toContain('diet');
    expect(result.current.config.weights.diet).toBe(30);

    act(() => result.current.setPillarActive('cardio', false));
    expect(result.current.config.activePillars).not.toContain('cardio');
  });

  it('edits a rule field', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setField('riskLimit', 80));

    expect(result.current.config.riskLimit).toBe(80);
    expect(result.current.isDirty).toBe(true);
  });

  it('keeps the draft and rejects with the API error when saving fails', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setField('riskLimit', 80));
    api.put.mockRejectedValueOnce({ userMessage: 'Configuração inválida' });

    await expect(result.current.save()).rejects.toMatchObject({ userMessage: 'Configuração inválida' });

    expect(result.current.config.riskLimit).toBe(80);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.saving).toBe(false);
  });
});
