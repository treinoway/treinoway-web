import userEvent from '@testing-library/user-event';
import { act, renderWithRouter, screen } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const VERIFICATION_REQUIRED_EVENT = 'teufit:emailVerificationRequired';
const DISMISS_KEY = 'teufit:emailBannerDismissed:user-1';
const mockShowToast = vi.fn();

// Mocks an authenticated trainer whose user carries the given fields.
const setupUser = (fields = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Lima',
      email: 'ana@example.com',
      roles: ['TRAINER'],
      betaAccess: true,
      ...fields,
    },
    isAuthenticated: true,
    logout: vi.fn(),
    hasRole: (role) => role === 'TRAINER',
    updateUser: vi.fn(),
    refreshUser: vi.fn().mockResolvedValue(null),
  });
};

// Renders the layout with placeholder page content.
const renderLayout = () => renderWithRouter(<Layout><span>Conteúdo da página</span></Layout>);

// Announces a blocked request the way the API layer does.
const announceVerificationRequired = (detail) => act(() => {
  window.dispatchEvent(new CustomEvent(VERIFICATION_REQUIRED_EVENT, { detail }));
});

describe('Layout e-mail verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useAiChat).mockReturnValue({ loading: false, hasNewResponse: false });
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(api.get).mockResolvedValue({ data: {} });
    vi.mocked(api.post).mockResolvedValue({ data: {} });
  });

  describe('banner', () => {
    it('shows the banner exactly once, next to the page content, for an unverified user', () => {
      setupUser({ emailVerified: false });

      const { container } = renderLayout();

      expect(screen.getAllByRole('button', { name: 'Inserir código' })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Reenviar' })).toHaveLength(1);
      expect(container.querySelectorAll('.ds-banner--warning')).toHaveLength(1);
      expect(container.querySelector('.ds-banner--warning')).toHaveTextContent(
        'Use o código enviado para ana@example.com. Libera a IA e convites sem limite.'
      );
      expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
    });

    it('opens the confirmation modal from "Inserir código"', async () => {
      setupUser({ emailVerified: false });
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('button', { name: 'Inserir código' }));

      expect(await screen.findByRole('dialog', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
    });

    it('shows no banner for a verified user', () => {
      setupUser({ emailVerified: true });

      renderLayout();

      expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();
      expect(screen.queryByText('Confirme seu e-mail')).not.toBeInTheDocument();
    });

    it('shows no banner when the user has no emailVerified field', () => {
      setupUser();

      renderLayout();

      expect(screen.getByText('Conteúdo da página')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();
    });
  });

  describe('request blocked by emailVerification.required', () => {
    it('opens the modal naming the AI when the blocked request was an AI call', async () => {
      setupUser({ emailVerified: false });
      renderLayout();

      announceVerificationRequired({ reason: 'ai' });

      expect(await screen.findByRole('dialog', { name: 'Confirme seu e-mail para usar a IA' })).toBeInTheDocument();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('opens the modal with the plain title for any other blocked request', async () => {
      setupUser({ emailVerified: false });
      renderLayout();

      announceVerificationRequired({});

      expect(await screen.findByRole('dialog', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('opens the modal even after the banner was dismissed for the session', async () => {
      setupUser({ emailVerified: false });
      const user = userEvent.setup();
      renderLayout();
      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();
      expect(sessionStorage.getItem(DISMISS_KEY)).not.toBeNull();

      announceVerificationRequired({ reason: 'ai' });

      expect(await screen.findByRole('dialog', { name: 'Confirme seu e-mail para usar a IA' })).toBeInTheDocument();
    });

    it('closes the modal from its close button and sends no code', async () => {
      setupUser({ emailVerified: false });
      const user = userEvent.setup();
      renderLayout();
      announceVerificationRequired({ reason: 'ai' });
      const dialog = await screen.findByRole('dialog', { name: 'Confirme seu e-mail para usar a IA' });
      expect(dialog).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Fechar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalledWith('/auth/verify-email', expect.anything());
    });
  });
});
