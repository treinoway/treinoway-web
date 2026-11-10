import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import useBisetCreate from './useBisetCreate';

// Template-biset: `endpointBuilder(trainingId)` must now cover create, dissolve
// AND round-rest, each returning an axios-style promise ({ data }). When it is
// supplied, the hook must never fall back to the /trainer/trainings endpoints.

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TEMPLATE_ID = 'tpl-1';

describe('useBisetCreate — endpointBuilder covers create, dissolve and rest', () => {
  let ops;
  let endpointBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    ops = {
      create: vi.fn().mockResolvedValue({ data: { id: TEMPLATE_ID } }),
      dissolve: vi.fn().mockResolvedValue({ data: { id: TEMPLATE_ID } }),
      updateRest: vi.fn().mockResolvedValue({ data: { id: TEMPLATE_ID } }),
    };
    endpointBuilder = vi.fn(() => ops);
  });

  it('createBiset delegates to endpointBuilder(trainingId).create(memberIds, restInterval) and returns response.data', async () => {
    const { result } = renderHook(() => useBisetCreate({ endpointBuilder }));
    let out;
    await act(async () => {
      out = await result.current.createBiset(['j1', 'j2'], { trainingId: TEMPLATE_ID, restInterval: 90 });
    });

    expect(endpointBuilder).toHaveBeenCalledWith(TEMPLATE_ID);
    expect(ops.create).toHaveBeenCalledWith(['j1', 'j2'], 90);
    expect(out).toEqual({ id: TEMPLATE_ID });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('dissolveBiset delegates to endpointBuilder(trainingId).dissolve(groupId)', async () => {
    const { result } = renderHook(() => useBisetCreate({ endpointBuilder }));
    await act(async () => {
      await result.current.dissolveBiset('g-1', { trainingId: TEMPLATE_ID });
    });

    expect(endpointBuilder).toHaveBeenCalledWith(TEMPLATE_ID);
    expect(ops.dissolve).toHaveBeenCalledWith('g-1');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('updateRest delegates to endpointBuilder(trainingId).updateRest(groupId, restInterval)', async () => {
    const { result } = renderHook(() => useBisetCreate({ endpointBuilder }));
    await act(async () => {
      await result.current.updateRest('g-1', 120, { trainingId: TEMPLATE_ID });
    });

    expect(endpointBuilder).toHaveBeenCalledWith(TEMPLATE_ID);
    expect(ops.updateRest).toHaveBeenCalledWith('g-1', 120);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('wraps endpointBuilder failures with the userMessage and exposes them in `error`', async () => {
    const err = new Error('x');
    err.userMessage = 'Descanso inválido';
    ops.updateRest.mockRejectedValue(err);
    const { result } = renderHook(() => useBisetCreate({ endpointBuilder }));

    await act(async () => {
      await expect(result.current.updateRest('g-1', 120, { trainingId: TEMPLATE_ID })).rejects.toThrow('Descanso inválido');
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.saving).toBe(false);
  });
});
