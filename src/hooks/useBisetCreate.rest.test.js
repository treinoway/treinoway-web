import { renderHook, act } from '@testing-library/react';
import api from '../api/axios';
import useBisetCreate from './useBisetCreate';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TRAINING_ID = 'training-uuid-001';

describe('useBisetCreate — round rest (criteria 12, 14)', () => {
  beforeEach(() => {
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('createBiset keeps the legacy body { exerciseIds } when no restInterval is given', async () => {
    api.post.mockResolvedValue({ data: { supersetGroupId: 'g', members: [] } });
    const { result } = renderHook(() => useBisetCreate());

    await act(async () => {
      await result.current.createBiset(['a', 'b'], { trainingId: TRAINING_ID });
    });

    expect(api.post).toHaveBeenCalledWith(`/trainer/trainings/${TRAINING_ID}/supersets`, { exerciseIds: ['a', 'b'] });
  });

  it('createBiset sends restInterval when provided in the context', async () => {
    api.post.mockResolvedValue({ data: { supersetGroupId: 'g', members: [] } });
    const { result } = renderHook(() => useBisetCreate());

    await act(async () => {
      await result.current.createBiset(['a', 'b'], { trainingId: TRAINING_ID, restInterval: 90 });
    });

    expect(api.post).toHaveBeenCalledWith(`/trainer/trainings/${TRAINING_ID}/supersets`, {
      exerciseIds: ['a', 'b'],
      restInterval: 90,
    });
  });

  it('updateRest PATCHes the group with { restInterval }', async () => {
    api.patch.mockResolvedValue({ data: { supersetGroupId: 'g1', restInterval: 120 } });
    const { result } = renderHook(() => useBisetCreate());

    await act(async () => {
      await result.current.updateRest('g1', 120, { trainingId: TRAINING_ID });
    });

    expect(api.patch).toHaveBeenCalledWith(`/trainer/trainings/${TRAINING_ID}/supersets/g1`, { restInterval: 120 });
  });

  it('updateRest rejects without a trainingId and does not call the API', async () => {
    const { result } = renderHook(() => useBisetCreate());

    await expect(act(() => result.current.updateRest('g1', 120, {}))).rejects.toThrow();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('updateRest wraps API failures using userMessage', async () => {
    api.patch.mockRejectedValue({ userMessage: 'Descanso inválido.' });
    const { result } = renderHook(() => useBisetCreate());

    await expect(
      act(() => result.current.updateRest('g1', 9999, { trainingId: TRAINING_ID }))
    ).rejects.toThrow('Descanso inválido.');
  });
});
