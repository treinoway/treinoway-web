import userEvent from '@testing-library/user-event';
import { act, render, renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import EmailVerificationBanner from './EmailVerificationBanner';
import Banner from './ds/Banner';
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

// Spy for AuthContext.updateUser, hoisted so the mock factory can share it.
const mockUpdateUser = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useAuth: () => {
      const user = useSyncExternalStore(authStore.subscribe, authStore.get);
      return {
        user,
        isAuthenticated: Boolean(user),
        updateUser: mockUpdateUser,
        refreshUser: () => Promise.resolve(authStore.get()),
        hasRole: () => true,
      };
    },
  };
});

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const USER = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Lima',
  roles: ['TRAINER'],
  betaAccess: true,
  emailVerified: false,
};

const DISMISS_KEY = 'teufit:emailBannerDismissed:user-1';
const BANNER_TITLE = 'Confirme seu e-mail';
const BANNER_BODY = 'Use o código enviado para ana@example.com. Libera a IA e convites sem limite.';
const SUCCESS_TEXT = 'E-mail confirmado. IA e convites liberados.';
const RESEND_COOLDOWN_MS = 60_000;
const SUCCESS_GONE_AFTER_MS = 10_000;

// Reads the role the DS Banner gives its warning tone.
const dsWarningBannerRole = () => {
  const { container, unmount } = render(<Banner tone="warning">Referência</Banner>);
  const role = container.firstChild.getAttribute('role');
  unmount();
  return role;
};

// Renders the banner inside a router.
const renderBanner = () => renderWithRouter(<EmailVerificationBanner />);

// Lists the URLs POSTed so far, in order.
const postedUrls = () => vi.mocked(api.post).mock.calls.map(([url]) => url);

// Returns the banner resend button whatever its cooldown label is.
const getResendButton = () => screen.getByRole('button', { name: /^Reenviar(?! código)/ });

// Opens the modal from the banner and confirms the given code.
const confirmCode = async (user, code = '123456') => {
  await user.click(screen.getByRole('button', { name: 'Inserir código' }));
  const dialog = await screen.findByRole('dialog', { name: BANNER_TITLE });
  await user.type(within(dialog).getByLabelText('Código de 6 dígitos'), code);
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
};

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    authStore.set(USER);
    mockUpdateUser.mockImplementation((next) => authStore.set(next));
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('unverified user', () => {
    it('renders one DS warning Banner with the title and the body naming the e-mail', () => {
      const { container } = renderBanner();

      const banners = container.querySelectorAll('.ds-banner');
      expect(banners).toHaveLength(1);
      expect(banners[0]).toHaveClass('ds-banner', 'ds-banner--warning');
      expect(banners[0]).toHaveAttribute('role', dsWarningBannerRole());
      expect(banners[0]).toHaveTextContent(BANNER_TITLE);
      expect(banners[0]).toHaveTextContent(BANNER_BODY);
    });

    it('renders "Inserir código", "Reenviar" and the "Fechar aviso" icon button inside the banner', () => {
      const { container } = renderBanner();

      const banner = within(container.querySelector('.ds-banner'));
      expect(banner.getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
      expect(banner.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
      expect(banner.getByRole('button', { name: 'Fechar aviso' })).toBeInTheDocument();
    });

    it('opens no dialog until asked', () => {
      renderBanner();

      expect(screen.getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('nothing to confirm', () => {
    it('renders nothing when emailVerified is true', () => {
      authStore.set({ ...USER, emailVerified: true });

      const { container } = renderBanner();

      expect(container.querySelector('.ds-banner')).toBeNull();
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });

    it('renders nothing when emailVerified is undefined', () => {
      const { emailVerified: _omitted, ...userWithoutFlag } = USER;
      authStore.set(userWithoutFlag);

      const { container } = renderBanner();

      expect(container.querySelector('.ds-banner')).toBeNull();
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });

    it('renders nothing when there is no user', () => {
      authStore.set(null);

      const { container } = renderBanner();

      expect(container.querySelector('.ds-banner')).toBeNull();
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });
  });

  describe('dismiss', () => {
    it('hides the banner and records the dismissal in sessionStorage for this user', async () => {
      const user = userEvent.setup();
      renderBanner();

      expect(sessionStorage.getItem(DISMISS_KEY)).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();
      expect(sessionStorage.getItem(DISMISS_KEY)).not.toBeNull();
      expect(localStorage.getItem(DISMISS_KEY)).toBeNull();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('does not render on a fresh mount when the dismissal key is set', async () => {
      const user = userEvent.setup();
      const first = renderBanner();
      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
      first.unmount();

      renderBanner();

      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();
    });

    it('still renders for another user in the same session', async () => {
      const user = userEvent.setup();
      const first = renderBanner();
      await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
      first.unmount();
      authStore.set({ ...USER, id: 'user-2', email: 'bia@example.com' });

      renderBanner();

      expect(screen.getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
      expect(screen.getByText(/bia@example\.com/)).toBeInTheDocument();
    });
  });

  describe('insert code', () => {
    it('opens the confirmation modal and closes it again without confirming', async () => {
      const user = userEvent.setup();
      renderBanner();

      await user.click(screen.getByRole('button', { name: 'Inserir código' }));

      const dialog = await screen.findByRole('dialog', { name: BANNER_TITLE });
      expect(within(dialog).getByLabelText('Código de 6 dígitos')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('updates the user, closes the modal, shows the success state and then disappears', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderBanner();

      await confirmCode(user);

      await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ ...USER, emailVerified: true }));
      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { code: '123456' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(await screen.findByText(SUCCESS_TEXT)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inserir código' })).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(SUCCESS_GONE_AFTER_MS);
      });

      await waitFor(() => expect(screen.queryByText(SUCCESS_TEXT)).not.toBeInTheDocument());
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });

    it('keeps the modal open and the banner unchanged when the code is rejected', async () => {
      vi.mocked(api.post).mockRejectedValue({ userMessage: 'Código inválido. Confira e tente de novo.' });
      const user = userEvent.setup();
      renderBanner();

      await confirmCode(user);

      const dialog = screen.getByRole('dialog', { name: BANNER_TITLE });
      expect(await within(dialog).findByText('Código inválido. Confira e tente de novo.')).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(screen.queryByText(SUCCESS_TEXT)).not.toBeInTheDocument();
    });
  });

  describe('resend', () => {
    it('calls /auth/verify-email/resend and keeps the button disabled for 60 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderBanner();

      await user.click(screen.getByRole('button', { name: 'Reenviar' }));

      await waitFor(() => expect(postedUrls()).toEqual(['/auth/verify-email/resend']));
      await waitFor(() => expect(getResendButton()).toBeDisabled());

      act(() => {
        vi.advanceTimersByTime(RESEND_COOLDOWN_MS - 2_000);
      });
      expect(getResendButton()).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(4_000);
      });
      await waitFor(() => expect(getResendButton()).toBeEnabled());
      expect(postedUrls()).toEqual(['/auth/verify-email/resend']);
    });
  });
});
