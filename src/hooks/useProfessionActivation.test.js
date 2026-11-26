import { act, renderHook } from '../test/test-utils';
import useProfessionActivation from './useProfessionActivation';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();

const TRAINER_TOKENS = { token: { accessToken: 'trainer-access' }, refreshToken: 'trainer-refresh' };

// Runs activate inside act and returns the error it rejected with, if any.
const runActivate = async (result, choice) => {
  let failure = null;
  await act(async () => {
    try {
      await result.current.activate(choice);
    } catch (error) {
      failure = error;
    }
  });
  return failure;
};

describe('useProfessionActivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockReset();
    mockRefreshUser.mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({ updateTokens: mockUpdateTokens, refreshUser: mockRefreshUser });
  });

  it('grants only the chosen role and reloads the user once', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: TRAINER_TOKENS });
    const { result } = renderHook(() => useProfessionActivation());

    const failure = await runActivate(result, { training: true, nutrition: false });

    expect(failure).toBeNull();
    expect(vi.mocked(api.patch).mock.calls.map(([url]) => url)).toEqual(['/become-trainer']);
    expect(mockUpdateTokens).toHaveBeenCalledWith('trainer-access', 'trainer-refresh');
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(result.current.activating).toBe(false);
  });

  it('rejects without reloading the user when the first call fails', async () => {
    const error = { userMessage: 'Falhou.' };
    vi.mocked(api.patch).mockRejectedValue(error);
    const { result } = renderHook(() => useProfessionActivation());

    const failure = await runActivate(result, { training: true, nutrition: true });

    expect(failure).toBe(error);
    expect(vi.mocked(api.patch).mock.calls.map(([url]) => url)).toEqual(['/become-trainer']);
    expect(mockUpdateTokens).not.toHaveBeenCalled();
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(result.current.activating).toBe(false);
  });

  it('keeps the first role and reloads the user when the second call fails', async () => {
    const error = { userMessage: 'Falhou.' };
    vi.mocked(api.patch).mockImplementation((url) => (
      url === '/become-trainer' ? Promise.resolve({ data: TRAINER_TOKENS }) : Promise.reject(error)
    ));
    const { result } = renderHook(() => useProfessionActivation());

    const failure = await runActivate(result, { training: true, nutrition: true });

    expect(failure).toBe(error);
    expect(mockUpdateTokens).toHaveBeenCalledTimes(1);
    expect(mockUpdateTokens).toHaveBeenCalledWith('trainer-access', 'trainer-refresh');
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(result.current.activating).toBe(false);
  });
});
