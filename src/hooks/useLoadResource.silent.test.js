import { renderHook, waitFor, act } from '../test/test-utils';
import useLoadResource from './useLoadResource';

describe('useLoadResource silent reload failure', () => {
  it('keeps the current data, sets no error and reports through onSilentError', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(['a'])
      .mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Falhou' }));
    const onSilentError = vi.fn();
    const { result } = renderHook(() => useLoadResource(load, 'k', { onSilentError }));
    await waitFor(() => expect(result.current.data).toEqual(['a']));

    await act(async () => { await result.current.reload({ silent: true }); });

    expect(result.current.data).toEqual(['a']);
    expect(result.current.error).toBeNull();
    expect(onSilentError).toHaveBeenCalledWith('Falhou');
  });

  it('still switches to the error state on a non-silent reload failure', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(['a'])
      .mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Falhou' }));
    const onSilentError = vi.fn();
    const { result } = renderHook(() => useLoadResource(load, 'k', { onSilentError }));
    await waitFor(() => expect(result.current.data).toEqual(['a']));

    await act(async () => { await result.current.reload(); });

    expect(result.current.error).toBe('Falhou');
    expect(onSilentError).not.toHaveBeenCalled();
  });
});
