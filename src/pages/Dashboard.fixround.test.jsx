import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '../test/test-utils';
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

const mockRefreshUser = vi.fn();
const mockUpdateTokens = vi.fn();
const showToast = vi.fn();

// Test helper: renders the dashboard next to the nutritionist patients route.
const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/nutritionist/patients" element={<h1>Tela Meus pacientes</h1>} />
    </Routes>
  </MemoryRouter>,
);

describe('Dashboard — after "Seja nutricionista" (fix round)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'active', roles: ['TRAINER'], betaAccess: true },
      hasRole: (role) => role === 'TRAINER',
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    api.get.mockResolvedValue({ data: [] });
  });

  it('navigates to /nutritionist/patients once the account is activated', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Seja nutricionista/ }));

    expect(await screen.findByRole('heading', { name: 'Tela Meus pacientes' })).toBeInTheDocument();
    expect(mockUpdateTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  });

  it('stays on the dashboard and does not navigate when activation fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Convite necessário.' }));
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Seja nutricionista/ }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Convite necessário.', 'error'));
    expect(screen.queryByRole('heading', { name: 'Tela Meus pacientes' })).not.toBeInTheDocument();
  });
});
