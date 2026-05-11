import { renderHook, act } from '@testing-library/react';
import api from '../api/axios';
import useBisetCreate from './useBisetCreate';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), delete: vi.fn() },
}));

const TRAINING_ID = 'training-uuid-001';

describe('useBisetCreate', () => {
  beforeEach(() => {
    api.post.mockReset();
    api.delete.mockReset();
  });

  // ── createBiset ────────────────────────────────────────────────────────────

  it('rejects when fewer than 2 member IDs are provided', async () => {
    const { result } = renderHook(() => useBisetCreate());
    await expect(
      act(() => result.current.createBiset(['a'], { trainingId: TRAINING_ID })),
    ).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects when more than 6 member IDs are provided', async () => {
    const { result } = renderHook(() => useBisetCreate());
    const ids = Array.from({ length: 7 }, (_, i) => `m${i}`);
    await expect(
      act(() => result.current.createBiset(ids, { trainingId: TRAINING_ID })),
    ).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects when trainingId is missing', async () => {
    const { result } = renderHook(() => useBisetCreate());
    await expect(
      act(() => result.current.createBiset(['a', 'b'], {})),
    ).rejects.toThrow('trainingId is required');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('POSTs to the transactional superset endpoint with exerciseIds', async () => {
    const responseData = {
      supersetGroupId: 'group-uuid',
      trainingId: TRAINING_ID,
      members: [
        { id: 'a', name: 'Ex A', order: 0, supersetOrder: 0 },
        { id: 'b', name: 'Ex B', order: 1, supersetOrder: 1 },
      ],
    };
    api.post.mockResolvedValue({ data: responseData });
    const { result } = renderHook(() => useBisetCreate());

    let resolved;
    await act(async () => {
      resolved = await result.current.createBiset(['a', 'b'], { trainingId: TRAINING_ID });
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      `/trainer/trainings/${TRAINING_ID}/supersets`,
      { exerciseIds: ['a', 'b'] },
    );
    expect(resolved).toEqual(responseData);
  });

  it('surfaces a user-friendly error when the POST fails', async () => {
    api.post.mockRejectedValue(
      Object.assign(new Error('api error'), { userMessage: 'Não foi possível criar.' }),
    );
    const { result } = renderHook(() => useBisetCreate());

    let caught;
    await act(async () => {
      try {
        await result.current.createBiset(['a', 'b'], { trainingId: TRAINING_ID });
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeDefined();
    expect(caught.message).toBe('Não foi possível criar.');
    expect(result.current.saving).toBe(false);
  });

  // ── dissolveBiset ──────────────────────────────────────────────────────────

  it('DELETEs the superset endpoint with groupId and trainingId', async () => {
    const responseData = {
      supersetGroupId: 'group-uuid',
      trainingId: TRAINING_ID,
      dissolvedCount: 2,
    };
    api.delete.mockResolvedValue({ data: responseData });
    const { result } = renderHook(() => useBisetCreate());

    let resolved;
    await act(async () => {
      resolved = await result.current.dissolveBiset('group-uuid', { trainingId: TRAINING_ID });
    });

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith(
      `/trainer/trainings/${TRAINING_ID}/supersets/group-uuid`,
    );
    expect(resolved).toEqual(responseData);
  });

  it('rejects when trainingId is missing in dissolveBiset', async () => {
    const { result } = renderHook(() => useBisetCreate());
    await expect(
      act(() => result.current.dissolveBiset('group-uuid', {})),
    ).rejects.toThrow('trainingId is required');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('returns early without calling DELETE when groupId is falsy', async () => {
    const { result } = renderHook(() => useBisetCreate());
    await act(() => result.current.dissolveBiset(null, { trainingId: TRAINING_ID }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('surfaces a user-friendly error when DELETE fails', async () => {
    api.delete.mockRejectedValue(new Error('api error'));
    const { result } = renderHook(() => useBisetCreate());

    let caught;
    await act(async () => {
      try {
        await result.current.dissolveBiset('group-uuid', { trainingId: TRAINING_ID });
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeDefined();
    expect(result.current.saving).toBe(false);
  });

  // ── endpointBuilder override ───────────────────────────────────────────────

  it('delegates to endpointBuilder when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ data: { supersetGroupId: 'g' } });
    const mockDissolve = vi.fn().mockResolvedValue({ data: { dissolvedCount: 2 } });
    const endpointBuilder = vi.fn().mockReturnValue({ create: mockCreate, dissolve: mockDissolve });

    const { result } = renderHook(() => useBisetCreate({ endpointBuilder }));

    await act(async () => {
      await result.current.createBiset(['a', 'b'], { trainingId: TRAINING_ID });
    });
    expect(endpointBuilder).toHaveBeenCalledWith(TRAINING_ID);
    expect(mockCreate).toHaveBeenCalledWith(['a', 'b']);
    expect(api.post).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.dissolveBiset('group-uuid', { trainingId: TRAINING_ID });
    });
    expect(mockDissolve).toHaveBeenCalledWith('group-uuid');
    expect(api.delete).not.toHaveBeenCalled();
  });
});
