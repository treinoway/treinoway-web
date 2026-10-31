import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../components/TrainerProfileSection', () => ({ default: () => <div /> }));

describe('Profile: in-app account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: 'ana@example.com', roles: ['TRAINER'] },
      updateUser: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue(null),
      hasRole: () => true,
      logout: vi.fn(),
      isAdmin: false,
    });
  });

  it('offers "Excluir conta" in the native app', () => {
    platform.isNative.mockReturnValue(true);

    renderWithRouter(<Profile />);

    expect(screen.getByRole('button', { name: /excluir conta/i })).toBeInTheDocument();
  });

  it('does not change the website profile', () => {
    platform.isNative.mockReturnValue(false);

    renderWithRouter(<Profile />);

    expect(screen.queryByRole('button', { name: /excluir conta/i })).not.toBeInTheDocument();
  });
});
