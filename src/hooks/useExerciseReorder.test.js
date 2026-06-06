import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

import { useToast } from '../contexts/ToastContext';
import useExerciseReorder from './useExerciseReorder';

const mockShowToast = vi.fn();

// Three plain exercises, no bi-sets, no substitutes.
const EXERCISES = [
  { id: 'ex-1', name: 'Supino' },
  { id: 'ex-2', name: 'Agachamento' },
  { id: 'ex-3', name: 'Remada' },
];

describe('useExerciseReorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('calls onReorder with ordered ids + reordered exercises (not the API)', async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useExerciseReorder({
        trainingId: 'tmp_draft',
        exercises: EXERCISES,
        readOnly: false,
        onReorder,
      })
    );

    // Move ex-1 to where ex-3 is (drag first onto last).
    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: 'ex-1' },
        over: { id: 'ex-3' },
      });
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const [orderedIds, reorderedExercises] = onReorder.mock.calls[0];
    expect(orderedIds).toEqual(['ex-2', 'ex-3', 'ex-1']);
    expect(reorderedExercises.map((e) => e.id)).toEqual(['ex-2', 'ex-3', 'ex-1']);
  });

  it('applies the optimistic local update immediately', async () => {
    let resolveReorder;
    const onReorder = vi.fn(
      () => new Promise((resolve) => { resolveReorder = resolve; })
    );

    const { result } = renderHook(() =>
      useExerciseReorder({
        trainingId: 'tmp_draft',
        exercises: EXERCISES,
        readOnly: false,
        onReorder,
      })
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'ex-1' },
        over: { id: 'ex-3' },
      });
    });

    // Optimistic order is visible before onReorder settles.
    expect(result.current.localExercises.map((e) => e.id)).toEqual([
      'ex-2',
      'ex-3',
      'ex-1',
    ]);

    await act(async () => {
      resolveReorder();
    });
  });

  it('rolls back and shows a toast when onReorder rejects', async () => {
    const apiError = Object.assign(new Error('fail'), {
      userMessage: 'Não foi possível reordenar os exercícios.',
    });
    const onReorder = vi.fn().mockRejectedValue(apiError);

    const { result } = renderHook(() =>
      useExerciseReorder({
        trainingId: 'real-uuid',
        exercises: EXERCISES,
        readOnly: false,
        onReorder,
      })
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: 'ex-1' },
        over: { id: 'ex-3' },
      });
    });

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        'Não foi possível reordenar os exercícios.',
        'error'
      )
    );
    // Local order reverted to the original.
    expect(result.current.localExercises.map((e) => e.id)).toEqual([
      'ex-1',
      'ex-2',
      'ex-3',
    ]);
  });

  it('calls onRefetchTraining after a successful onReorder', async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);
    const onRefetchTraining = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useExerciseReorder({
        trainingId: 'real-uuid',
        exercises: EXERCISES,
        readOnly: false,
        onReorder,
        onRefetchTraining,
      })
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: 'ex-1' },
        over: { id: 'ex-2' },
      });
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onRefetchTraining).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when readOnly', async () => {
    const onReorder = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useExerciseReorder({
        trainingId: 'real-uuid',
        exercises: EXERCISES,
        readOnly: true,
        onReorder,
      })
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: 'ex-1' },
        over: { id: 'ex-3' },
      });
    });

    expect(onReorder).not.toHaveBeenCalled();
  });
});
