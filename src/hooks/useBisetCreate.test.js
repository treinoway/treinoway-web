import { renderHook, act } from '@testing-library/react';
import api from '../api/axios';
import useBisetCreate from './useBisetCreate';

vi.mock('../api/axios', () => ({
  default: { patch: vi.fn() },
}));

const member = (id, extras = {}) => ({
  id,
  name: `Ex ${id}`,
  supersetGroupId: null,
  supersetOrder: null,
  ...extras,
});

describe('useBisetCreate', () => {
  beforeEach(() => {
    api.patch.mockReset();
  });

  it('rejects when fewer than 2 members are provided', async () => {
    const { result } = renderHook(() => useBisetCreate());
    await expect(
      act(() => result.current.createBiset([member('a')]))
    ).rejects.toThrow();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects when more than 6 members are provided', async () => {
    const { result } = renderHook(() => useBisetCreate());
    const members = Array.from({ length: 7 }, (_, i) => member(`m${i}`));
    await expect(
      act(() => result.current.createBiset(members))
    ).rejects.toThrow();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('PATCHes each member with the same groupId and consecutive order', async () => {
    api.patch.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useBisetCreate());
    const members = [member('a'), member('b'), member('c')];

    let resolved;
    await act(async () => {
      resolved = await result.current.createBiset(members);
    });

    expect(api.patch).toHaveBeenCalledTimes(3);
    const groupIds = api.patch.mock.calls.map((call) => call[1].supersetGroupId);
    const orders = api.patch.mock.calls.map((call) => call[1].supersetOrder);
    // All members share the same groupId
    expect(new Set(groupIds).size).toBe(1);
    // Consecutive 0,1,2
    expect(orders).toEqual([0, 1, 2]);
    expect(resolved.groupId).toBe(groupIds[0]);
    expect(resolved.members).toEqual(members);
  });

  it('rolls back applied PATCHes when one mid-sequence rejects', async () => {
    api.patch
      .mockResolvedValueOnce({ data: {} }) // a OK
      .mockResolvedValueOnce({ data: {} }) // b OK
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { userMessage: 'falha' })) // c FAIL
      .mockResolvedValueOnce({ data: {} }) // rollback b
      .mockResolvedValueOnce({ data: {} }); // rollback a

    const { result } = renderHook(() => useBisetCreate());
    const members = [
      member('a', { supersetGroupId: null, supersetOrder: null }),
      member('b', { supersetGroupId: null, supersetOrder: null }),
      member('c', { supersetGroupId: null, supersetOrder: null }),
    ];

    let caught;
    await act(async () => {
      try {
        await result.current.createBiset(members);
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeDefined();
    // 3 forward + 2 rollback = 5 calls
    expect(api.patch).toHaveBeenCalledTimes(5);
    // Last two calls should clear the supersetGroupId on b then a
    const rollbackCallB = api.patch.mock.calls[3];
    const rollbackCallA = api.patch.mock.calls[4];
    expect(rollbackCallB[0]).toBe('/trainer/exercises/b');
    expect(rollbackCallB[1]).toEqual({ supersetGroupId: null, supersetOrder: null });
    expect(rollbackCallA[0]).toBe('/trainer/exercises/a');
    expect(rollbackCallA[1]).toEqual({ supersetGroupId: null, supersetOrder: null });
  });

  it('flags an inconsistent error when rollback also fails', async () => {
    api.patch
      .mockResolvedValueOnce({ data: {} }) // a OK
      .mockRejectedValueOnce(new Error('boom')) // b FAIL
      .mockRejectedValueOnce(new Error('rollback boom')); // rollback a FAIL

    const { result } = renderHook(() => useBisetCreate());
    const members = [member('a'), member('b')];
    let caught;
    await act(async () => {
      try {
        await result.current.createBiset(members);
      } catch (e) {
        caught = e;
      }
    });
    expect(caught).toBeDefined();
    expect(caught.inconsistent).toBe(true);
    expect(caught.message).toMatch(/Estado inconsistente/);
  });

  describe('dissolveBiset', () => {
    it('sets supersetGroupId to null on each member sequentially', async () => {
      api.patch.mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useBisetCreate());
      const members = [
        member('a', { supersetGroupId: 'g1', supersetOrder: 0 }),
        member('b', { supersetGroupId: 'g1', supersetOrder: 1 }),
      ];
      await act(() => result.current.dissolveBiset(members));
      expect(api.patch).toHaveBeenCalledTimes(2);
      expect(api.patch.mock.calls[0][1]).toEqual({
        supersetGroupId: null,
        supersetOrder: null,
      });
      expect(api.patch.mock.calls[1][1]).toEqual({
        supersetGroupId: null,
        supersetOrder: null,
      });
    });

    it('rolls back when one PATCH rejects', async () => {
      api.patch
        .mockResolvedValueOnce({ data: {} }) // a OK
        .mockRejectedValueOnce(new Error('boom')) // b FAIL
        .mockResolvedValueOnce({ data: {} }); // rollback a OK

      const { result } = renderHook(() => useBisetCreate());
      const members = [
        member('a', { supersetGroupId: 'g1', supersetOrder: 0 }),
        member('b', { supersetGroupId: 'g1', supersetOrder: 1 }),
      ];
      let caught;
      await act(async () => {
        try {
          await result.current.dissolveBiset(members);
        } catch (e) {
          caught = e;
        }
      });
      expect(caught).toBeDefined();
      expect(api.patch).toHaveBeenCalledTimes(3);
      // Rollback restores a's previous group/order
      expect(api.patch.mock.calls[2][0]).toBe('/trainer/exercises/a');
      expect(api.patch.mock.calls[2][1]).toEqual({
        supersetGroupId: 'g1',
        supersetOrder: 0,
      });
    });
  });
});
