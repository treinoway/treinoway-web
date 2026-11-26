import { act, renderHook } from '../test/test-utils';
import useEmailCodeResend from './useEmailCodeResend';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Runs resend inside act and returns the error it rejected with, if any.
const runResend = async (result) => {
  let failure = null;
  await act(async () => {
    try {
      await result.current.resend();
    } catch (error) {
      failure = error;
    }
  });
  return failure;
};

describe('useEmailCodeResend', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1', email: 'ana@example.com' } });
  });

  it('posts to /auth/verify-email/resend and starts the 60 s cooldown', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useEmailCodeResend());

    const failure = await runResend(result);

    expect(failure).toBeNull();
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email/resend');
    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(60);
    expect(result.current.resending).toBe(false);
  });

  it('starts the cooldown from details.retryAfterSeconds when the server answers 429', async () => {
    const error = {
      userMessage: 'Aguarde um pouco antes de solicitar um novo código.',
      errorInfo: { status: 429, messageCode: 'emailVerification.resendCooldown', details: { retryAfterSeconds: 37 } },
    };
    vi.mocked(api.post).mockRejectedValue(error);
    const { result } = renderHook(() => useEmailCodeResend());

    const failure = await runResend(result);

    expect(failure).toBe(error);
    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(37);
  });

  it('rejects and starts no cooldown for a failure without a wait time', async () => {
    const error = { userMessage: 'Não foi possível enviar o e-mail de verificação. Tente novamente.' };
    vi.mocked(api.post).mockRejectedValue(error);
    const { result } = renderHook(() => useEmailCodeResend());

    const failure = await runResend(result);

    expect(failure).toBe(error);
    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.resending).toBe(false);
  });
});
