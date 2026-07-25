import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../hooks/useBetaGate', () => ({
  default: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';
import useBetaGate from '../hooks/useBetaGate';

const renderAt = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/invite" element={<div>Invite Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBetaGate).mockReturnValue(false);
  });

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    renderAt();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /invite when the beta gate blocks the user', () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    vi.mocked(useBetaGate).mockReturnValue(true);
    renderAt();
    expect(screen.getByText('Invite Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and not blocked', () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    renderAt();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
