import userEvent from '@testing-library/user-event';
import { act, render, renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import EmailVerificationModal from './EmailVerificationModal';
import Modal from './ds/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockUpdateUser = vi.fn();

const USER = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Lima',
  roles: ['TRAINER'],
  betaAccess: true,
  emailVerified: false,
  platformPlan: { tier: 'BETA', status: 'ACTIVE' },
};

const CODE_LABEL = 'Código de 6 dígitos';
const RESEND_COOLDOWN_MS = 60_000;

// Reads the dialog classes and the close label the DS Modal renders.
const dsModalMarkup = () => {
  const { unmount } = render(<Modal title="Referência" onClose={() => {}}>conteúdo</Modal>);
  const dialog = screen.getByRole('dialog', { name: 'Referência' });
  const markup = {
    classes: dialog.className.split(' '),
    closeLabel: within(dialog).getAllByRole('button')[0].getAttribute('aria-label'),
  };
  unmount();
  return markup;
};

// Renders the modal and returns the onClose spy.
const renderModal = (props = {}) => {
  const onClose = vi.fn();
  renderWithRouter(<EmailVerificationModal onClose={onClose} {...props} />);
  return { onClose };
};

// Lists the URLs POSTed so far, in order.
const postedUrls = () => vi.mocked(api.post).mock.calls.map(([url]) => url);

// Returns the resend button whatever its cooldown label is.
const getResendButton = () => screen.getByRole('button', { name: /^Reenviar código/ });

describe('EmailVerificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({
      user: USER,
      isAuthenticated: true,
      updateUser: mockUpdateUser,
      refreshUser: vi.fn().mockResolvedValue(USER),
      hasRole: () => true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('layout', () => {
    it('renders a DS Modal dialog titled "Confirme seu e-mail"', () => {
      const reference = dsModalMarkup();
      renderModal();

      const dialog = screen.getByRole('dialog', { name: 'Confirme seu e-mail' });
      expect(dialog).toHaveClass('ds-modal');
      expect(dialog).toHaveClass(...reference.classes);
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).getByRole('button', { name: reference.closeLabel })).toBeInTheDocument();
    });

    it('names the blocked action in the title when reason is "ai"', () => {
      renderModal({ reason: 'ai' });

      expect(screen.getByRole('dialog', { name: 'Confirme seu e-mail para usar a IA' })).toBeInTheDocument();
    });

    it('renders the code field as a numeric DS input limited to 6 characters, with the e-mail hint', () => {
      renderModal();

      const input = screen.getByLabelText(CODE_LABEL);
      expect(input).toHaveClass('input');
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('maxlength', '6');
      expect(screen.getByText('Enviado para ana@example.com')).toBeInTheDocument();
    });

    it('renders "Confirmar" as a DS primary button and a "Reenviar código" button', () => {
      renderModal();

      expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('btn', 'btn--primary');
      expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled();
    });
  });

  describe('code entry', () => {
    it('keeps "Confirmar" disabled until 6 digits are typed', async () => {
      const user = userEvent.setup();
      renderModal();
      const confirm = screen.getByRole('button', { name: 'Confirmar' });

      expect(confirm).toBeDisabled();

      await user.type(screen.getByLabelText(CODE_LABEL), '12345');
      expect(confirm).toBeDisabled();

      await user.type(screen.getByLabelText(CODE_LABEL), '6');
      expect(confirm).toBeEnabled();
    });

    it('accepts digits only and at most 6 of them', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.type(screen.getByLabelText(CODE_LABEL), 'ab12cd34567890');

      expect(screen.getByLabelText(CODE_LABEL)).toHaveValue('123456');
    });
  });

  describe('confirm', () => {
    it('posts the code to /auth/verify-email', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.type(screen.getByLabelText(CODE_LABEL), '123456');
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { code: '123456' }));
      expect(postedUrls()).toEqual(['/auth/verify-email']);
    });

    it('marks the user as verified keeping every other field, then closes', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.type(screen.getByLabelText(CODE_LABEL), '123456');
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalledWith({ ...USER, emailVerified: true });
    });

    it('shows error.userMessage inside the dialog and stays open when the code is rejected', async () => {
      vi.mocked(api.post).mockRejectedValue({ userMessage: 'Código inválido. Confira e tente de novo.' });
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.type(screen.getByLabelText(CODE_LABEL), '123456');
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      const dialog = screen.getByRole('dialog');
      expect(await within(dialog).findByText('Código inválido. Confira e tente de novo.')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(screen.getByLabelText(CODE_LABEL)).toHaveValue('123456');
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    });
  });

  describe('close without confirming', () => {
    it('calls onClose from the DS close button and sends nothing', async () => {
      const reference = dsModalMarkup();
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(screen.getByRole('button', { name: reference.closeLabel }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(api.post).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('resend', () => {
    it('calls /auth/verify-email/resend and shows a neutral confirmation', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByRole('button', { name: 'Reenviar código' }));

      await waitFor(() => expect(postedUrls()).toEqual(['/auth/verify-email/resend']));
      const dialog = screen.getByRole('dialog');
      await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent(/\S/));
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the resend button disabled for 60 seconds after a resend', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderModal();

      await user.click(screen.getByRole('button', { name: 'Reenviar código' }));
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

    it('shows error.userMessage inside the dialog when the resend is rejected', async () => {
      vi.mocked(api.post).mockRejectedValue({ userMessage: 'Aguarde um minuto para pedir outro código.' });
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(screen.getByRole('button', { name: 'Reenviar código' }));

      const dialog = screen.getByRole('dialog');
      expect(await within(dialog).findByText('Aguarde um minuto para pedir outro código.')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
