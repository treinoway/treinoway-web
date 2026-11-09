import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('Profile for a nutritionist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: 'ana@example.com', firstName: 'Ana', lastName: 'Lima', roles: ['NUTRITIONIST'] },
      updateUser: vi.fn(),
      refreshUser: vi.fn().mockResolvedValue(null),
      hasRole: (role) => role === 'NUTRITIONIST',
      logout: vi.fn(),
      isAdmin: false,
    });
    api.get.mockResolvedValue({ data: {} });
  });

  it('has no nutritionist profile section and never asks the nutritionist API', () => {
    renderWithRouter(<Profile />, { route: '/profile' });
    expect(screen.queryByText(/perfil profissional/i)).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/nutritionist');
  });
});
