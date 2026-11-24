import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen } from '../test/test-utils';
import ForgotPassword from './ForgotPassword';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// Opens the page already on the reset step through the "already have a code" shortcut.
const openResetStep = async (user) => {
  renderWithRouter(<ForgotPassword />, { route: '/forgot-password' });
  await user.click(screen.getByRole('button', { name: /já recebeu um código/i }));
};

describe('ForgotPassword on DS components', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  it('renders the e-mail step submit as a DS primary button', () => {
    renderWithRouter(<ForgotPassword />, { route: '/forgot-password' });

    const submit = screen.getByRole('button', { name: 'Enviar código' });
    expect(submit).toHaveClass('btn', 'btn--primary');
    expect(submit).not.toHaveClass('btn-primary-full');
  });

  it('renders the e-mail step field as a DS input', () => {
    renderWithRouter(<ForgotPassword />, { route: '/forgot-password' });

    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveClass('input');
    expect(input).not.toHaveClass('form-input');
  });

  it('renders the reset step submit as a DS primary button', async () => {
    const user = userEvent.setup();
    await openResetStep(user);

    const submit = screen.getByRole('button', { name: 'Redefinir senha' });
    expect(submit).toHaveClass('btn', 'btn--primary');
    expect(submit).not.toHaveClass('btn-primary-full');
  });

  it.each([/^e-mail$/i, /^código$/i, /^nova senha$/i, /^confirmar nova senha$/i])(
    'renders the reset step field %s as a DS input',
    async (label) => {
      const user = userEvent.setup();
      await openResetStep(user);

      const input = screen.getByLabelText(label);
      expect(input).toHaveClass('input');
      expect(input).not.toHaveClass('form-input');
    }
  );
});
