import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../utils/getGreeting', () => ({ default: vi.fn(() => 'Bom dia') }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockHasRole = vi.fn();

// Asserts none of the three removed dashboard cards is rendered.
const expectCardsHidden = () => {
  expect(screen.queryByText('Campeonatos')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /campeonatos/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Seja um Nutricionista')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Seja um Nutricionista/ })).not.toBeInTheDocument();
};

describe('Dashboard hidden cards (Campeonatos, Seja um Nutricionista)', () => {
  beforeEach(() => {
    mockHasRole.mockReset();
    api.get.mockReset();
    api.get.mockImplementation((url) => {
      if (url === '/nutritionist') return Promise.resolve({ data: { profileCompletedAt: '2026-01-01' } });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'active', roles: [] },
      hasRole: mockHasRole,
      refreshUser: vi.fn().mockResolvedValue(null),
      updateTokens: vi.fn(),
    });
  });

  it('hides all three cards for a trainer-only user', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
  });

  it('hides all three cards for a trainer who is also a nutritionist', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER' || role === 'NUTRITIONIST');
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
  });

  it('hides all three cards for a plain user (activation mode)', () => {
    mockHasRole.mockReturnValue(false);
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
    expect(screen.getByText('Seja um Treinador')).toBeInTheDocument();
  });

  it('keeps the nutritionist onboarding card for a nutritionist with an incomplete profile', async () => {
    mockHasRole.mockImplementation((role) => role === 'NUTRITIONIST');
    api.get.mockImplementation((url) => {
      if (url === '/nutritionist') return Promise.resolve({ data: { profileCompletedAt: null } });
      return Promise.resolve({ data: {} });
    });
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
    expect(await screen.findByRole('link', { name: /completar cadastro/i })).toBeInTheDocument();
  });

  it('renders no empty "Ações" section when the user has no AI access', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', roles: ['TRAINER'], platformPlan: { tier: 'FREE', limits: { aiActionsPerStudent: 0 } } },
      hasRole: mockHasRole,
      refreshUser: vi.fn().mockResolvedValue(null),
      updateTokens: vi.fn(),
    });
    renderWithRouter(<Dashboard />);
    expect(screen.queryByRole('heading', { name: 'Ações' })).not.toBeInTheDocument();
  });
});
