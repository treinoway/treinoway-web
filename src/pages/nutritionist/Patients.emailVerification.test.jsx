import userEvent from '@testing-library/user-event';
import { act, renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import Patients from './Patients';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { buildPatientRow } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Builds the error the axios interceptor rejects with for the given 4xx body.
const apiError = (status, data, userMessage) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data };
  error.userMessage = userMessage;
  error.errorInfo = { messageCode: data.messageCode, errorCode: data.error, status, details: null };
  return error;
};

// Opens the invite modal from the header and submits the given e-mail.
const submitInvite = async (user, email) => {
  await screen.findByText('Luiza Andrade');
  await user.click(screen.getByRole('button', { name: 'Convidar paciente' }));
  const dialog = await screen.findByRole('dialog', { name: 'Convidar paciente' });
  await user.type(within(dialog).getByLabelText('E-mail do paciente'), email);
  await user.click(within(dialog).getByRole('button', { name: 'Convidar' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/patient-invites', { email }));
  await act(() => new Promise((resolve) => { setTimeout(resolve, 0); }));
};

describe('Patients — invite blocked by emailVerification.required', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/nutritionist/patients') return Promise.resolve({ data: { items: [buildPatientRow()] } });
      return Promise.resolve({ data: { items: [] } });
    });
    vi.mocked(api.post).mockReset();
  });

  it('shows no error toast when the 4th invite is refused for an unverified e-mail', async () => {
    vi.mocked(api.post).mockRejectedValue(apiError(403, {
      error: 'EMAIL_VERIFICATION_REQUIRED',
      messageCode: 'emailVerification.required',
      message: 'Confirme seu e-mail para continuar.',
    }, 'Confirme seu e-mail para continuar.'));
    const user = userEvent.setup();
    renderWithRouter(<Patients />, { route: '/nutritionist/patients' });

    await submitInvite(user, 'quarto@example.com');

    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
    expect(showToast).not.toHaveBeenCalledWith('Confirme seu e-mail para continuar.', expect.anything());
  });

  it('still shows the error toast for any other refused invite', async () => {
    vi.mocked(api.post).mockRejectedValue(apiError(403, {
      error: 'FORBIDDEN',
      messageCode: 'auth.forbidden',
      message: 'Sem permissão.',
    }, 'Sem permissão.'));
    const user = userEvent.setup();
    renderWithRouter(<Patients />, { route: '/nutritionist/patients' });

    await submitInvite(user, 'quarto@example.com');

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Sem permissão.', 'error'));
  });
});
