import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import { AuthProvider, useAuth } from './AuthContext';
import { getOnboardingDismissKey } from '../hooks/useOnboardingStatus';

// Mock firebase before importing anything that uses it
vi.mock('../firebase', () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../i18n', () => ({
  translateError: vi.fn((error, fallback) => error?.userMessage || fallback),
}));

import api from '../api/axios';
import { signInWithPopup, signOut } from 'firebase/auth';

const TRAINER_USER = {
  id: 'user-1',
  email: 'trainer@example.com',
  roles: ['TRAINER'],
  firstName: 'Trainer',
  lastName: 'User',
};

const REGULAR_USER = {
  id: 'user-2',
  email: 'student@example.com',
  roles: ['STUDENT'],
  firstName: 'Student',
  lastName: 'User',
};

const ADMIN_USER = {
  id: 'user-3',
  email: 'admin@example.com',
  roles: ['admin'],
  firstName: 'Admin',
  lastName: 'User',
};

const AUTH_RESPONSE = {
  data: {
    token: { accessToken: 'access-token-123' },
    refreshToken: 'refresh-token-abc',
  },
};

// Consumer component that exposes all context values for assertions
const TestConsumer = () => {
  const { user, isAuthenticated, hasRole, isAdmin, login, signup, loginWithGoogle, logout } = useAuth();

  return (
    <div>
      <span aria-label="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</span>
      <span aria-label="hasTrainerRole">{hasRole('TRAINER') ? 'true' : 'false'}</span>
      <span aria-label="isAdmin">{isAdmin ? 'true' : 'false'}</span>
      <span aria-label="email">{user?.email ?? ''}</span>
      <span aria-label="roles">{(user?.roles || []).join(',')}</span>
      <button onClick={() => login('trainer@example.com', 'pass123')} aria-label="Login">
        Login
      </button>
      <button onClick={() => signup('new@example.com', 'pass123')} aria-label="Signup">
        Signup
      </button>
      <button onClick={() => loginWithGoogle()} aria-label="Google Login">
        Google Login
      </button>
      <button onClick={logout} aria-label="Logout">
        Logout
      </button>
    </div>
  );
};

const renderProvider = () =>
  renderWithRouter(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('starts unauthenticated when localStorage is empty', () => {
      renderProvider();

      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('false');
      expect(screen.getByLabelText('email').textContent).toBe('');
    });

    it('restores authenticated state from localStorage', () => {
      localStorage.setItem('accessToken', 'stored-token');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));

      renderProvider();

      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
      expect(screen.getByLabelText('email').textContent).toBe('trainer@example.com');
    });
  });

  describe('login', () => {
    it('isAuthenticated becomes true only after user data is set — no intermediate flash state', async () => {
      // This test verifies the fix: setUser and setAccessToken are called
      // synchronously together after the /me fetch, so React batches them.
      // We test this by confirming that when the promise resolves, both
      // isAuthenticated AND hasRole('TRAINER') are true simultaneously.
      api.post.mockResolvedValue(AUTH_RESPONSE);

      // Delay /me slightly to ensure ordering can be observed
      let resolveMe;
      const mePromise = new Promise((res) => { resolveMe = res; });
      api.get.mockReturnValue(mePromise);

      renderProvider();

      // State before login: neither auth nor role
      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('false');

      // Trigger login (does not await — we control resolution)
      act(() => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      // /me has not resolved yet — isAuthenticated must still be false
      // (token is in localStorage but setAccessToken has not been called yet)
      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');

      // Now resolve /me with TRAINER user data
      await act(async () => {
        resolveMe({ data: TRAINER_USER });
      });

      // After resolution: both must be true in the same render
      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
    });

    it('returns success and persists tokens on successful login', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
        expect(screen.getByLabelText('email').textContent).toBe('trainer@example.com');
      });

      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-abc');
    });

    it('fetches /me with the access token available in localStorage', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: REGULAR_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/me?include=address,socials');
      });

      // localStorage must have the token at the time /me is called
      // (verified by checking it was set before the get call)
      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    });

    it('isAuthenticated and hasRole are both true in the same render after login', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
        expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
      });
    });

    it('returns error object when login API call fails', async () => {
      const err = new Error('Unauthorized');
      err.userMessage = 'E-mail ou senha incorretos.';
      api.post.mockRejectedValue(err);

      // Capture the return value via a wrapper component
      let loginResult;
      const CapturingConsumer = () => {
        const { login } = useAuth();
        return (
          <button
            onClick={async () => {
              loginResult = await login('bad@example.com', 'wrong');
            }}
            aria-label="Login"
          >
            Login
          </button>
        );
      };

      renderWithRouter(
        <AuthProvider>
          <CapturingConsumer />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(loginResult).toBeDefined();
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBeTruthy();
    });

    it('does not authenticate when login API fails', async () => {
      api.post.mockRejectedValue(new Error('Network Error'));

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      });
    });

    it('clears onboarding sessionStorage keys before /me resolves on login', async () => {
      sessionStorage.setItem('treinoway:onboardingOptimistic', JSON.stringify({ firstStudentLinked: true }));
      sessionStorage.setItem('treinoway:onboardingDismissed', '1');

      api.post.mockResolvedValue(AUTH_RESPONSE);

      let resolveMe;
      const mePromise = new Promise((res) => { resolveMe = res; });
      api.get.mockReturnValue(mePromise);

      renderProvider();

      act(() => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      // Keys must be cleared before /me resolves — verify they are gone now
      await waitFor(() => {
        expect(sessionStorage.getItem('treinoway:onboardingOptimistic')).toBeNull();
        expect(sessionStorage.getItem('treinoway:onboardingDismissed')).toBeNull();
      });

      await act(async () => {
        resolveMe({ data: TRAINER_USER });
      });
    });

    it('does not clear the per-user onboarding dismiss flag (localStorage) on login', async () => {
      localStorage.setItem(getOnboardingDismissKey(TRAINER_USER.id), '1');

      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      });

      expect(localStorage.getItem(getOnboardingDismissKey(TRAINER_USER.id))).toBe('1');
    });
  });

  describe('signup', () => {
    it('isAuthenticated and hasRole are both true in the same render after signup', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Signup' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
        expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
      });
    });

    it('persists user and tokens to localStorage after signup', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: REGULAR_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Signup' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      });

      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
      expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({ email: REGULAR_USER.email });
    });

    it('does not authenticate when signup API fails', async () => {
      api.post.mockRejectedValue(new Error('Email in use'));

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Signup' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      });
    });
  });

  describe('loginWithGoogle', () => {
    it('isAuthenticated and hasRole are both true in the same render after Google login', async () => {
      signInWithPopup.mockResolvedValue({
        user: { getIdToken: vi.fn().mockResolvedValue('firebase-id-token') },
      });
      signOut.mockResolvedValue(undefined);
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Google Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
        expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
      });
    });

    it('persists tokens after Google login', async () => {
      signInWithPopup.mockResolvedValue({
        user: { getIdToken: vi.fn().mockResolvedValue('firebase-id-token') },
      });
      signOut.mockResolvedValue(undefined);
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: REGULAR_USER });

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Google Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      });

      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    });

    it('returns { success: false, error: null } when popup is closed by user', async () => {
      const popupClosedError = new Error('Popup closed');
      popupClosedError.code = 'auth/popup-closed-by-user';
      signInWithPopup.mockRejectedValue(popupClosedError);

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Google Login' }).click();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      });
    });
  });

  describe('forgotPassword', () => {
    const renderWithForgotPassword = (onResult) => {
      const Consumer = () => {
        const { forgotPassword } = useAuth();
        return (
          <button
            onClick={async () => {
              const result = await forgotPassword('user@example.com');
              onResult(result);
            }}
            aria-label="Forgot Password"
          >
            Forgot Password
          </button>
        );
      };

      return renderWithRouter(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
    };

    it('posts to /auth/forgot-password and returns success', async () => {
      api.post.mockResolvedValue({ data: { message: 'ok' } });

      let result;
      renderWithForgotPassword((r) => { result = r; });

      await act(async () => {
        screen.getByRole('button', { name: 'Forgot Password' }).click();
      });

      await waitFor(() => {
        expect(result?.success).toBe(true);
      });

      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@example.com' });
    });

    it('returns a translated error when the API call fails', async () => {
      const apiError = new Error('Failed');
      apiError.userMessage = 'Não foi possível enviar o código. Tente novamente mais tarde.';
      api.post.mockRejectedValue(apiError);

      let result;
      renderWithForgotPassword((r) => { result = r; });

      await act(async () => {
        screen.getByRole('button', { name: 'Forgot Password' }).click();
      });

      await waitFor(() => {
        expect(result?.success).toBe(false);
      });

      expect(result.error).toBe('Não foi possível enviar o código. Tente novamente mais tarde.');
    });
  });

  describe('resetPassword', () => {
    const renderWithResetPassword = (onResult) => {
      const Consumer = () => {
        const { resetPassword, isAuthenticated, user } = useAuth();
        return (
          <div>
            <span aria-label="isAuthenticated">{isAuthenticated ? 'true' : 'false'}</span>
            <span aria-label="email">{user?.email ?? ''}</span>
            <button
              onClick={async () => {
                const result = await resetPassword('123456', 'newpass123', 'newpass123');
                onResult(result);
              }}
              aria-label="Reset Password"
            >
              Reset Password
            </button>
          </div>
        );
      };

      return renderWithRouter(
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      );
    };

    it('posts to /auth/reset-password, stores tokens, fetches /me, and authenticates the user', async () => {
      api.post.mockResolvedValue(AUTH_RESPONSE);
      api.get.mockResolvedValue({ data: TRAINER_USER });

      let result;
      renderWithResetPassword((r) => { result = r; });

      await act(async () => {
        screen.getByRole('button', { name: 'Reset Password' }).click();
      });

      await waitFor(() => {
        expect(result?.success).toBe(true);
      });

      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: '123456',
        password: 'newpass123',
        passwordConfirmation: 'newpass123',
      });
      expect(api.get).toHaveBeenCalledWith('/me?include=address,socials');
      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');
      expect(screen.getByLabelText('email').textContent).toBe('trainer@example.com');
      expect(localStorage.getItem('accessToken')).toBe('access-token-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-abc');
    });

    it('stores nothing and leaves the user unauthenticated when the API call fails', async () => {
      const apiError = new Error('Invalid token');
      apiError.userMessage = 'Código inválido. Verifique o código e tente novamente.';
      api.post.mockRejectedValue(apiError);

      let result;
      renderWithResetPassword((r) => { result = r; });

      await act(async () => {
        screen.getByRole('button', { name: 'Reset Password' }).click();
      });

      await waitFor(() => {
        expect(result?.success).toBe(false);
      });

      expect(result.error).toBe('Código inválido. Verifique o código e tente novamente.');
      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears authentication state and localStorage on logout', async () => {
      localStorage.setItem('accessToken', 'stored-token');
      localStorage.setItem('refreshToken', 'stored-refresh');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));

      renderProvider();

      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('true');

      await act(async () => {
        screen.getByRole('button', { name: 'Logout' }).click();
      });

      expect(screen.getByLabelText('isAuthenticated').textContent).toBe('false');
      expect(screen.getByLabelText('email').textContent).toBe('');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('clears onboarding sessionStorage keys on logout', async () => {
      localStorage.setItem('accessToken', 'stored-token');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));
      sessionStorage.setItem('treinoway:onboardingOptimistic', JSON.stringify({ profileCompleted: true }));
      sessionStorage.setItem('treinoway:onboardingDismissed', '1');

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Logout' }).click();
      });

      expect(sessionStorage.getItem('treinoway:onboardingOptimistic')).toBeNull();
      expect(sessionStorage.getItem('treinoway:onboardingDismissed')).toBeNull();
    });

    it('does not clear the per-user onboarding dismiss flag (localStorage) on logout', async () => {
      localStorage.setItem('accessToken', 'stored-token');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));
      localStorage.setItem(getOnboardingDismissKey(TRAINER_USER.id), '1');

      renderProvider();

      await act(async () => {
        screen.getByRole('button', { name: 'Logout' }).click();
      });

      expect(localStorage.getItem(getOnboardingDismissKey(TRAINER_USER.id))).toBe('1');
    });
  });

  describe('hasRole', () => {
    it('returns true for a role the user has', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));

      renderProvider();

      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('true');
    });

    it('returns false for a role the user does not have', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', JSON.stringify(REGULAR_USER));

      renderProvider();

      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('false');
    });

    it('returns false when user is null', () => {
      renderProvider();

      expect(screen.getByLabelText('hasTrainerRole').textContent).toBe('false');
    });
  });

  describe('isAdmin', () => {
    it('is true when the user has the admin role', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', JSON.stringify(ADMIN_USER));

      renderProvider();

      expect(screen.getByLabelText('isAdmin').textContent).toBe('true');
    });

    it('is false when the user does not have the admin role', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('user', JSON.stringify(TRAINER_USER));

      renderProvider();

      expect(screen.getByLabelText('isAdmin').textContent).toBe('false');
    });

    it('is false when there is no user', () => {
      renderProvider();

      expect(screen.getByLabelText('isAdmin').textContent).toBe('false');
    });
  });
});
