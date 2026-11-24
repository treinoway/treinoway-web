import { renderWithRouter, screen, waitFor } from '../test/test-utils';
import InviteRedeem from './InviteRedeem';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();
const mockUpdateUser = vi.fn();

const ROUTE_WITH_CODE = '/invite?code=TF-ABCD-EFGH-12';

// Builds the rejection of POST /invite/redeem for the given messageCode.
const redeemError = (messageCode, userMessage) => ({
  userMessage,
  errorInfo: { messageCode, errorCode: null, status: 400, details: null },
  response: { status: 400, data: { messageCode } },
});

describe('InviteRedeem on DS components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'carolina@teufit.com.br', firstName: 'Carolina', betaAccess: true },
      isAuthenticated: true,
      updateTokens: mockUpdateTokens,
      refreshUser: mockRefreshUser,
      updateUser: mockUpdateUser,
      logout: vi.fn(),
    });
  });

  it('redeems an old link for a logged-in user, shows a DS primary button and ends on "/"', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: { accessToken: 'access-2' }, refreshToken: 'refresh-2' } });

    renderWithRouter(<InviteRedeem />, { route: ROUTE_WITH_CODE });

    const opening = await screen.findByRole('button', { name: /abrindo seu painel/i });
    expect(opening).toHaveClass('btn', 'btn--primary');
    expect(opening).not.toHaveClass('btn-primary-full');
    expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-ABCD-EFGH-12' });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }), { timeout: 3000 });
  });

  it('renders the retry submit as a DS primary button and the code field as a DS input after a failed redeem', async () => {
    vi.mocked(api.post).mockRejectedValue(redeemError('invite.notFound', 'Convite não encontrado.'));

    renderWithRouter(<InviteRedeem />, { route: ROUTE_WITH_CODE });

    const retry = await screen.findByRole('button', { name: 'Tentar novamente' });
    expect(retry).toHaveClass('btn', 'btn--primary');
    expect(retry).not.toHaveClass('btn-primary-full');
    const codeInput = screen.getByLabelText('Código do convite');
    expect(codeInput).toHaveClass('input');
    expect(codeInput).not.toHaveClass('form-input');
  });

  it('renders "Entrar com outra conta" as a DS primary button when the invite belongs to another e-mail', async () => {
    vi.mocked(api.post).mockRejectedValue(redeemError('invite.emailMismatch', 'Este convite é de outro e-mail.'));

    renderWithRouter(<InviteRedeem />, { route: ROUTE_WITH_CODE });

    const switchAccount = await screen.findByRole('button', { name: 'Entrar com outra conta' });
    expect(switchAccount).toHaveClass('btn', 'btn--primary');
    expect(switchAccount).not.toHaveClass('btn-primary-full');
  });
});
