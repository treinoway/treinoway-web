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

// Asserts the removed Campeonatos card is not rendered.
const expectChampionshipsHidden = () => {
  expect(screen.queryByText('Campeonatos')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /campeonatos/i })).not.toBeInTheDocument();
};

// Asserts neither Campeonatos nor "Seja nutricionista" is rendered.
const expectCardsHidden = () => {
  expectChampionshipsHidden();
  expect(screen.queryByText('Seja nutricionista')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Seja nutricionista/ })).not.toBeInTheDocument();
};

describe('Dashboard hidden cards (Campeonatos, Seja nutricionista)', () => {
  beforeEach(() => {
    mockHasRole.mockReset();
    api.get.mockReset();
    api.get.mockImplementation((url) => {
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

  it('hides Campeonatos and keeps "Seja nutricionista" for a trainer-only user, with no beta access needed', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    renderWithRouter(<Dashboard />);
    expectChampionshipsHidden();
    expect(screen.getByRole('button', { name: /Seja nutricionista/ })).toBeInTheDocument();
  });

  it('hides all three cards for a trainer who is also a nutritionist', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER' || role === 'NUTRITIONIST');
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
  });

  it('hides all three cards for a plain user, who gets the profession choice instead', () => {
    mockHasRole.mockReturnValue(false);
    renderWithRouter(<Dashboard />);
    expectCardsHidden();
    expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
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
