import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NutritionistRoute from './NutritionistRoute';

// Hoisted toast spy so the mock factory and assertions share it.
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import { useAuth } from '../contexts/AuthContext';

// Renders the guarded route at the given path inside a memory router.
const renderAt = (path = '/nutritionist/patients') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/invite" element={<div>Invite Page</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/nutritionist/patients"
          element={
            <NutritionistRoute>
              <div>Nutritionist Content</div>
            </NutritionistRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('NutritionistRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, hasRole: () => false });
    renderAt();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to / when authenticated and not a nutritionist', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, hasRole: () => false });
    renderAt();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows the "not active" toast without pointing to a removed dashboard card', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, hasRole: () => false });
    renderAt();
    expect(mockShowToast).toHaveBeenCalledWith('Este perfil não está ativo.', 'error');
  });

  it('renders children for a nutritionist', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, hasRole: (r) => r === 'NUTRITIONIST' });
    renderAt();
    expect(screen.getByText('Nutritionist Content')).toBeInTheDocument();
  });
});
