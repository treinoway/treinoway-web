import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const loginWithGoogle = vi.fn();
const loginWithApple = vi.fn();

describe('Login in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      loginWithGoogle,
      loginWithApple,
    });
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
    loginWithGoogle.mockResolvedValue({ success: true, user: { id: 1 } });
    loginWithApple.mockResolvedValue({ success: true, user: { id: 1 } });
    platform.isNative.mockReturnValue(true);
    platform.getPlatform.mockReturnValue('ios');
  });

  it('offers Apple sign-in on iOS and signs in through loginWithApple', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com apple/i }));

    expect(loginWithApple).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not offer Apple sign-in on Android', () => {
    platform.getPlatform.mockReturnValue('android');

    renderWithRouter(<Login />);

    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument();
  });

  it('keeps Google sign-in available through loginWithGoogle', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });
});

describe('Login on the website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      loginWithGoogle,
      loginWithApple,
    });
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
    platform.isNative.mockReturnValue(false);
    platform.getPlatform.mockReturnValue('web');
  });

  it('shows Google but no Apple sign-in', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument();
  });
});
