import { renderHook, waitFor, act } from '../test/test-utils';
import useLoadResource from './useLoadResource';

describe('useLoadResource', () => {
  it('starts loading, then exposes the data', async () => {
    const load = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useLoadResource(load, 'a'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(result.current.error).toBeNull();
  });

  it('exposes the user message on failure and recovers on reload', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Falhou' }))
      .mockResolvedValue('ok');
    const { result } = renderHook(() => useLoadResource(load, 'a'));
    await waitFor(() => expect(result.current.error).toBe('Falhou'));

    await act(async () => { await result.current.reload(); });

    expect(result.current.data).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('reloads when the key changes', async () => {
    const load = vi.fn().mockResolvedValue('x');
    const { rerender } = renderHook(({ key }) => useLoadResource(load, key), { initialProps: { key: 'a' } });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ key: 'b' });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it('does not load while disabled', async () => {
    const load = vi.fn().mockResolvedValue('x');
    renderHook(() => useLoadResource(load, 'a', { enabled: false }));
    await new Promise((resolve) => { setTimeout(resolve, 20); });
    expect(load).not.toHaveBeenCalled();
  });

  it('updates data locally with setData', async () => {
    const load = vi.fn().mockResolvedValue([1]);
    const { result } = renderHook(() => useLoadResource(load, 'a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setData((list) => [...list, 2]));
    expect(result.current.data).toEqual([1, 2]);
  });
});
