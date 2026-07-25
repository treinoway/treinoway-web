import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireRole from './RequireRole';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../hooks/useBetaGate', () => ({
  default: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';
import useBetaGate from '../hooks/useBetaGate';

const ProtectedContent = () => <div>Protected Admin Content</div>;
const LoginPage = () => <div>Login Page</div>;
const DashboardPage = () => <div>Dashboard Page</div>;
const InvitePage = () => <div>Invite Page</div>;

const renderWithRoutes = (initialPath = '/admin/videos', requiredRoles = ['admin']) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route
          path="/admin/videos"
          element={
            <RequireRole roles={requiredRoles}>
              <ProtectedContent />
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('RequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBetaGate).mockReturnValue(false);
  });

  it('redirects to /invite when the beta gate blocks the user, before the role check', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: () => true,
    });
    vi.mocked(useBetaGate).mockReturnValue(true);

    renderWithRoutes();

    expect(screen.getByText('Invite Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      hasRole: () => false,
    });

    renderWithRoutes();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when user is authenticated but lacks the required role', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: (role) => role === 'trainer',
    });

    renderWithRoutes();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when user has one of the required roles', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: (role) => role === 'admin',
    });

    renderWithRoutes();

    expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders children when user has any one of multiple accepted roles', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      hasRole: (role) => role === 'admin',
    });

    renderWithRoutes('/admin/videos', ['trainer', 'admin']);

    expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
  });
});
