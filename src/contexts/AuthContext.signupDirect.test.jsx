import { act, renderHook } from '../test/test-utils';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../api/axios';

vi.mock('../firebase', () => ({ auth: {}, googleProvider: {} }));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const ME = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Lima',
  roles: [],
  emailVerified: false,
  betaAccess: true,
};

const TOKENS = { token: { accessToken: 'access-1' }, refreshToken: 'refresh-1', user: ME };

// Builds the error the axios interceptor rejects with for a 409 on signup.
const emailInUseError = () => {
  const error = new Error('Request failed with status code 409');
  error.response = {
    status: 409,
    data: { error: 'EMAIL_IN_USE', messageCode: 'resource.conflict', message: 'Este e-mail já está cadastrado.' },
  };
  error.userMessage = 'Este e-mail já está cadastrado.';
  error.errorInfo = { errorCode: 'EMAIL_IN_USE', messageCode: 'resource.conflict', status: 409, details: null };
  return error;
};

// Mounts the auth hook inside the real provider.
const renderAuth = () => renderHook(() => useAuth(), { wrapper: AuthProvider });

// Runs signupDirect inside act and returns what it resolved with.
const runSignupDirect = async (result, payload) => {
  let outcome;
  await act(async () => {
    outcome = await result.current.signupDirect(payload);
  });
  return outcome;
};

describe('AuthContext.signupDirect', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockResolvedValue({ data: TOKENS });
    vi.mocked(api.get).mockResolvedValue({ data: ME });
  });

  it('posts the four fields to /auth/signup/direct', async () => {
    const { result } = renderAuth();

    await runSignupDirect(result, { email: 'ana@example.com', password: 'pass1234', firstName: 'Ana', lastName: 'Lima' });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/signup/direct', {
      email: 'ana@example.com',
      password: 'pass1234',
      firstName: 'Ana',
      lastName: 'Lima',
    });
  });

  it('sends no lastName when it is not given', async () => {
    const { result } = renderAuth();

    await runSignupDirect(result, { email: 'ana@example.com', password: 'pass1234', firstName: 'Ana' });

    const [url, body] = vi.mocked(api.post).mock.calls[0];
    expect(url).toBe('/auth/signup/direct');
    expect(body.firstName).toBe('Ana');
    expect(body.lastName).toBeUndefined();
  });

  it('establishes the session and returns the fresh user on 201', async () => {
    const { result } = renderAuth();

    const outcome = await runSignupDirect(result, { email: 'ana@example.com', password: 'pass1234', firstName: 'Ana', lastName: 'Lima' });

    expect(outcome).toEqual({ success: true, user: ME });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(ME);
    expect(localStorage.getItem('accessToken')).toBe('access-1');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
  });

  it('returns the translated message and the EMAIL_IN_USE code on 409 without authenticating', async () => {
    vi.mocked(api.post).mockRejectedValue(emailInUseError());
    const { result } = renderAuth();

    const outcome = await runSignupDirect(result, { email: 'ana@example.com', password: 'pass1234', firstName: 'Ana' });

    expect(outcome).toMatchObject({
      success: false,
      error: 'Este e-mail já está cadastrado.',
      errorCode: 'EMAIL_IN_USE',
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });
});
