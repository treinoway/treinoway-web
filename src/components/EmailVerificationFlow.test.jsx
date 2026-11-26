import userEvent from '@testing-library/user-event';
import { act, renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import EmailVerificationBanner from './EmailVerificationBanner';
import { ResendCooldownProvider } from '../contexts/ResendCooldownContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

// Holds the mocked auth user and re-renders subscribers when it changes, like the real context.
const authStore = vi.hoisted(() => {
  let user = null;
  const listeners = new Set();
  return {
    get: () => user,
    set: (next) => {
      user = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock('../contexts/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useAuth: () => {
      const user = useSyncExternalStore(authStore.subscribe, authStore.get);
      return { user, isAuthenticated: Boolean(user), updateUser: (next) => authStore.set(next) };
    },
  };
});

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const USER = { id: 'user-1', email: 'ana@example.com', roles: ['TRAINER'], emailVerified: false };
const SUCCESS_TEXT = 'E-mail confirmado. IA e convites liberados.';
const VERIFIED_EVENT = 'teufit:emailVerified';

// Renders the banner inside the app-wide cooldown provider.
const renderFlow = () => renderWithRouter(
  <ResendCooldownProvider>
    <EmailVerificationBanner />
  </ResendCooldownProvider>
);

// Announces a confirmation made with a code in this session.
const announceVerified = (userId) => act(() => {
  window.dispatchEvent(new CustomEvent(VERIFIED_EVENT, { detail: { userId } }));
});

describe('e-mail verification flow (banner + modal)', () => {
  let showToast;

  beforeEach(() => {
    sessionStorage.clear();
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    authStore.set(USER);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('one resend cooldown', () => {
    it('applies a resend made in the banner to the modal opened afterwards', async () => {
      const user = userEvent.setup();
      renderFlow();

      await user.click(screen.getByRole('button', { name: 'Reenviar' }));
      await waitFor(() => expect(screen.getByRole('button', { name: /^Reenviar \(\d+s\)$/ })).toBeDisabled());
      await user.click(screen.getByRole('button', { name: 'Inserir código' }));

      const dialog = await screen.findByRole('dialog', { name: 'Confirme seu e-mail' });
      expect(within(dialog).getByRole('button', { name: /^Reenviar código \(\d+s\)$/ })).toBeDisabled();
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('applies a resend made in the modal to the banner, and keeps it after the modal closes', async () => {
      const user = userEvent.setup();
      renderFlow();

      await user.click(screen.getByRole('button', { name: 'Inserir código' }));
      const dialog = await screen.findByRole('dialog', { name: 'Confirme seu e-mail' });
      await user.click(within(dialog).getByRole('button', { name: 'Reenviar código' }));
      await waitFor(() => expect(within(dialog).getByRole('button', { name: /^Reenviar código \(\d+s\)$/ })).toBeDisabled());
      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));

      expect(screen.getByRole('button', { name: /^Reenviar \(\d+s\)$/ })).toBeDisabled();
    });

    it('starts the cooldown from the wait time of a 429 and shows the error', async () => {
      vi.mocked(api.post).mockRejectedValue({
        userMessage: 'Aguarde um pouco antes de solicitar um novo código.',
        errorInfo: { status: 429, messageCode: 'emailVerification.resendCooldown', details: { retryAfterSeconds: 37 } },
      });
      const user = userEvent.setup();
      renderFlow();

      await user.click(screen.getByRole('button', { name: 'Reenviar' }));

      await waitFor(() => expect(screen.getByRole('button', { name: 'Reenviar (37s)' })).toBeDisabled());
      expect(showToast).toHaveBeenCalledWith('Aguarde um pouco antes de solicitar um novo código.', 'error');
    });

    it('leaves the resend enabled after a failure that carries no wait time', async () => {
      vi.mocked(api.post).mockRejectedValue({ userMessage: 'Não foi possível enviar o e-mail de verificação. Tente novamente.' });
      const user = userEvent.setup();
      renderFlow();

      await user.click(screen.getByRole('button', { name: 'Reenviar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error'));
      expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
    });
  });

  describe('success state', () => {
    it('shows no success banner when the e-mail turns verified without a confirmation made here', () => {
      renderFlow();

      act(() => authStore.set({ ...USER, emailVerified: true }));

      expect(screen.queryByText(SUCCESS_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByText('Confirme seu e-mail')).not.toBeInTheDocument();
    });

    it('shows the success banner when a confirmation for this user is announced, then removes it', () => {
      vi.useFakeTimers();
      renderFlow();

      announceVerified('user-1');
      act(() => authStore.set({ ...USER, emailVerified: true }));

      expect(screen.getByText(SUCCESS_TEXT)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(screen.queryByText(SUCCESS_TEXT)).not.toBeInTheDocument();
    });

    it('shows the success banner after the warning was dismissed and the code was confirmed elsewhere in the shell', async () => {
      const user = userEvent.setup();
      renderFlow();
      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

      announceVerified('user-1');

      expect(screen.getByText(SUCCESS_TEXT)).toBeInTheDocument();
    });

    it('ignores a confirmation announced for another user', () => {
      renderFlow();

      announceVerified('user-2');

      expect(screen.queryByText(SUCCESS_TEXT)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
    });
  });
});
