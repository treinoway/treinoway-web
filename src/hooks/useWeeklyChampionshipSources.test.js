import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/axios';
import useWeeklyChampionshipSources from './useWeeklyChampionshipSources';

const CONFIG_URL = '/trainer/consistency-ranking/config';
const STUDENTS = [{ id: 's1', firstName: 'Ana' }];
const RANKING_CONFIG = {
  timeZone: 'America/Manaus',
  minPodiumWeeks: 3,
  weights: { workouts: 60, cardio: 40, feedback: 0, hydration: 0, diet: 0 },
  activePillars: ['workouts', 'cardio'],
};

// Answers the config URL with the given outcome and the students URL with the list
const mockSources = (configOutcome) => {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return configOutcome;
    return Promise.resolve({ data: STUDENTS });
  });
};

describe('useWeeklyChampionshipSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CPD-01 exposes the weights and active pillars saved in the ranking config', async () => {
    mockSources(Promise.resolve({ data: RANKING_CONFIG }));
    const { result } = renderHook(() => useWeeklyChampionshipSources(true));

    await waitFor(() => expect(result.current.configLoaded).toBe(true));
    expect(result.current.weights).toEqual(RANKING_CONFIG.weights);
    expect(result.current.activePillars).toEqual(['workouts', 'cardio']);
    expect(result.current.scoringSource).toBe('ranking');
    expect(result.current.timeZone).toBe('America/Manaus');
    expect(result.current.minPodiumWeeks).toBe(3);
    await waitFor(() => expect(result.current.students).toEqual(STUDENTS));
  });

  it('CPD-81 falls back to the default weights when the ranking config fails', async () => {
    mockSources(Promise.reject(new Error('network')));
    const { result } = renderHook(() => useWeeklyChampionshipSources(true));

    await waitFor(() => expect(result.current.configLoaded).toBe(true));
    expect(result.current.weights).toEqual({ workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 });
    expect(result.current.activePillars).toEqual(['workouts', 'cardio', 'feedback', 'hydration']);
    expect(result.current.activePillars).not.toContain('diet');
    expect(result.current.scoringSource).toBe('default');
    expect(result.current.minPodiumWeeks).toBe(2);
  });
});
