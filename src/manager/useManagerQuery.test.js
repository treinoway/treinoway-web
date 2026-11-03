import { renderHook, waitFor } from '../test/test-utils';
import useManagerQuery from './useManagerQuery';

describe('useManagerQuery', () => {
  it('is loading, then exposes the data', async () => {
    const request = vi.fn().mockResolvedValue({ ok: 1 });
    const { result } = renderHook(() => useManagerQuery(request));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ ok: 1 });
    expect(result.current.message).toBeNull();
  });

  it('exposes error.userMessage on failure', async () => {
    const request = vi.fn().mockRejectedValue({ userMessage: 'Falhou' });
    const { result } = renderHook(() => useManagerQuery(request));

    await waitFor(() => expect(result.current.message).toBe('Falhou'));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refetches and returns to loading when the request changes', async () => {
    const first = vi.fn().mockResolvedValue('a');
    const second = vi.fn().mockResolvedValue('b');
    const { result, rerender } = renderHook(({ request }) => useManagerQuery(request), {
      initialProps: { request: first },
    });
    await waitFor(() => expect(result.current.data).toBe('a'));

    rerender({ request: second });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('b'));
  });
});
