import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';
import useConsistencyStudentPanel from './useConsistencyStudentPanel';

const BASE_URL = '/trainer/consistency-ranking';
const STUDENT_ID = 'student-1';

// Panel response of the student
const panel = (overrides = {}) => ({ data: { studentId: STUDENT_ID, firstName: 'João', weakestPillar: 'cardio', ...overrides } });

describe('useConsistencyStudentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(panel());
    api.post.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('loads the panel of the student, starting in loading', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}`);
    expect(result.current.data.firstName).toBe('João');
    expect(result.current.error).toBeNull();
  });

  it('does not request anything while no student is selected', () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(null));

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('exposes the API error message when loading fails', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Aluno não encontrado' });
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));

    await waitFor(() => expect(result.current.error).toBe('Aluno não encontrado'));
    expect(result.current.data).toBeNull();
  });

  it('PAN-29 pauses the week of the student with the reason and reloads the panel', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.get.mockResolvedValueOnce(panel({ firstName: 'Atualizado' }));

    await act(async () => {
      await result.current.pauseWeek({ weekStart: '2026-11-09', reason: 'viagem' });
    });

    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { weekStart: '2026-11-09', studentId: STUDENT_ID, reason: 'viagem' });
    await waitFor(() => expect(result.current.data.firstName).toBe('Atualizado'));
  });

  it('PAN-32 resumes a paused week', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.resumeWeek('2026-11-09');
    });

    expect(api.delete).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { data: { weekStart: '2026-11-09', studentId: STUDENT_ID } });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('PAN-33 adjusts the target of a pillar for the current week', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.adjustTarget({ pillar: 'workouts', value: 2 });
    });

    expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}/targets`, { pillar: 'workouts', value: 2 });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('PAN-34 rejects with the API error and keeps the panel when the adjustment is refused', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.put.mockRejectedValueOnce({ userMessage: 'Meta acima da congelada' });

    await expect(result.current.adjustTarget({ pillar: 'workouts', value: 9 })).rejects.toMatchObject({ userMessage: 'Meta acima da congelada' });

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.current.data.firstName).toBe('João');
  });

  it('PAN-25 logs the contact with the weakest pillar and reloads the last contact', async () => {
    const { result } = renderHook(() => useConsistencyStudentPanel(STUDENT_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logContact('cardio');
    });

    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/students/${STUDENT_ID}/contacts`, { pillar: 'cardio' });
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
