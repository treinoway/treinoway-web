import { renderHook, act } from '@testing-library/react';
import useGoogleAuth from './useGoogleAuth';

const setup = (loginWithGoogle, extra = {}) => {
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const hook = renderHook(() => useGoogleAuth({ loginWithGoogle, onSuccess, onError, ...extra }));
  return { ...hook, onSuccess, onError };
};

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

describe('useGoogleAuth', () => {
  it('is not exchanging while the popup is open', async () => {
    const { result } = setup(() => new Promise(() => {}));

    act(() => { result.current.startGoogleAuth(); });

    expect(result.current.isExchanging).toBe(false);
  });

  it('switches to exchanging when the popup resolves', () => {
    const { result } = setup(({ onPopupResolved }) => {
      onPopupResolved();
      return new Promise(() => {});
    });

    act(() => { result.current.startGoogleAuth(); });

    expect(result.current.isExchanging).toBe(true);
  });

  it('calls onSuccess with the user on success', async () => {
    const user = { id: 'u1' };
    const { result, onSuccess, onError } = setup(vi.fn().mockResolvedValue({ success: true, user }));

    await act(async () => { await result.current.startGoogleAuth(); });

    expect(onSuccess).toHaveBeenCalledWith(user);
    expect(onError).not.toHaveBeenCalled();
  });

  it('stays silent and resets when the attempt was cancelled', async () => {
    const { result, onError } = setup(vi.fn().mockResolvedValue({ success: false, error: null }));

    await act(async () => { await result.current.startGoogleAuth(); });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.isExchanging).toBe(false);
  });

  it('maps the credential conflict to a friendly message', async () => {
    const { result, onError } = setup(vi.fn().mockResolvedValue({
      success: false,
      error: 'Firebase: auth/account-exists-with-different-credential',
    }));

    await act(async () => { await result.current.startGoogleAuth(); });

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/já está cadastrado com senha/i));
  });

  it('reports an unexpected error when loginWithGoogle throws', async () => {
    const { result, onError } = setup(vi.fn().mockRejectedValue(new Error('boom')));

    await act(async () => { await result.current.startGoogleAuth(); });

    expect(onError).toHaveBeenCalledWith('Ocorreu um erro inesperado.');
    expect(result.current.isExchanging).toBe(false);
  });

  it('ignores a stale attempt result and keeps the newer one pending', async () => {
    const first = deferred();
    const loginWithGoogle = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(new Promise(() => {}));
    const { result, onSuccess, onError } = setup(loginWithGoogle);

    act(() => { result.current.startGoogleAuth(); });
    act(() => { result.current.startGoogleAuth(); });
    await act(async () => { first.resolve({ success: false, error: 'stale error' }); });

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isExchanging).toBe(false);
  });
});
