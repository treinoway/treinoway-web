import userEvent from '@testing-library/user-event';
import { act, renderWithRouter, screen, waitFor } from '../../test/test-utils';
import Students from './Students';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/useOnboardingStatus', () => ({ markOnboardingStepOptimistic: vi.fn() }));

// Builds the error the axios interceptor rejects with for the given 4xx body.
const apiError = (status, data, userMessage) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data };
  error.userMessage = userMessage;
  error.errorInfo = { messageCode: data.messageCode, errorCode: data.error, status, details: null };
  return error;
};

// Opens the link modal from the empty state and submits the given e-mail.
const submitInvite = async (user, email) => {
  await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
  await user.type(screen.getByLabelText(/e-mail do aluno/i), email);
  await user.click(screen.getByRole('button', { name: /^vincular$/i }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trainer/student-invites', { email }));
  await act(() => new Promise((resolve) => { setTimeout(resolve, 0); }));
};

describe('Students — invite blocked by emailVerification.required', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockReset();
  });

  it('shows no error toast when the 4th invite is refused for an unverified e-mail', async () => {
    vi.mocked(api.post).mockRejectedValue(apiError(403, {
      error: 'EMAIL_VERIFICATION_REQUIRED',
      messageCode: 'emailVerification.required',
      message: 'Confirme seu e-mail para enviar mais convites.',
    }, 'Confirme seu e-mail para enviar mais convites.'));
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await submitInvite(user, 'quarto@example.com');

    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
    expect(showToast).not.toHaveBeenCalledWith('Confirme seu e-mail para enviar mais convites.', expect.anything());
  });

  it('still shows the error toast for any other refused invite', async () => {
    vi.mocked(api.post).mockRejectedValue(apiError(403, {
      error: 'FORBIDDEN',
      messageCode: 'auth.forbidden',
      message: 'Sem permissão.',
    }, 'Sem permissão.'));
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await submitInvite(user, 'quarto@example.com');

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error'));
  });
});
