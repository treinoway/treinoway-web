import { renderHook, waitFor, act } from '@testing-library/react';
import useAdminQuery from './useAdminQuery';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

const mockShowToast = vi.fn();
const params = { page: 1 };

describe('useAdminQuery', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('loads data with the given params', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1] });

    const { result } = renderHook(() => useAdminQuery(fetcher, params));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual({ items: [1] });
  });

  it('exposes the error and shows an error toast when the fetch fails', async () => {
    const fetcher = vi.fn().mockRejectedValue({ userMessage: 'Falha de rede' });

    const { result } = renderHook(() => useAdminQuery(fetcher, params));

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
  });

  it('refetches on reload', async () => {
    const fetcher = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAdminQuery(fetcher, params));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('patches the loaded data with setData', async () => {
    const fetcher = vi.fn().mockResolvedValue({ total: 1 });
    const { result } = renderHook(() => useAdminQuery(fetcher, params));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setData((data) => ({ ...data, total: 2 })));

    expect(result.current.data).toEqual({ total: 2 });
  });

  it('keeps the previous data as staleData while refetching', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ id: 1 }).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ query }) => useAdminQuery(fetcher, query), {
      initialProps: { query: { page: 1 } },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ query: { page: 2 } });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.staleData).toEqual({ id: 1 });
  });

  it('ignores a stale response that resolves after a newer one', async () => {
    let resolveFirst;
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ id: 'new' });
    const { result, rerender } = renderHook(({ query }) => useAdminQuery(fetcher, query), {
      initialProps: { query: { page: 1 } },
    });

    rerender({ query: { page: 2 } });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'new' }));
    await act(async () => resolveFirst({ id: 'old' }));

    expect(result.current.data).toEqual({ id: 'new' });
  });
});
