import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';

// Hoisted so the vi.mock factories below can reference this fake.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn().mockRejectedValue({ userMessage: 'x' }) } }));

describe('Login sign-up links', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, login: vi.fn(), loginWithGoogle: vi.fn(), loginWithApple: vi.fn() });
    platform.getPlatform.mockReturnValue('android');
  });

  it('are hidden in the native app', () => {
    platform.isNative.mockReturnValue(true);

    renderWithRouter(<Login />);

    expect(screen.queryByRole('link', { name: /criar conta/i })).not.toBeInTheDocument();
  });

  it('stay on the website', () => {
    platform.isNative.mockReturnValue(false);

    renderWithRouter(<Login />);

    expect(screen.getByRole('link', { name: /criar conta/i })).toBeInTheDocument();
  });
});
