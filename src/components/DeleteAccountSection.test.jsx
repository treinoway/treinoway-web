import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within, render } from '../test/test-utils';
import DeleteAccountSection from './DeleteAccountSection';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const logout = vi.fn();
const showToast = vi.fn();

// Opens the confirmation by pressing the in-app delete action.
const openConfirmation = async (user) => {
  await user.click(screen.getByRole('button', { name: /excluir conta/i }));
  return screen.findByRole('alertdialog');
};

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ logout });
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('asks for confirmation before deleting anything', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    const dialog = await openConfirmation(user);

    expect(dialog).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('calls DELETE /me on confirm and signs out afterwards', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: /excluir/i }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(api.delete).toHaveBeenCalledWith('/me');
    expect(api.delete.mock.invocationCallOrder[0]).toBeLessThan(logout.mock.invocationCallOrder[0]);
  });

  it('keeps the session and does nothing when the user cancels', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountSection />);

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('shows the error and keeps the session when the deletion fails', async () => {
    const user = userEvent.setup();
    const error = new Error('Server Error');
    error.userMessage = 'Não foi possível excluir a conta.';
    api.delete.mockRejectedValue(error);
    render(<DeleteAccountSection />);

    const dialog = await openConfirmation(user);
    await user.click(within(dialog).getByRole('button', { name: /excluir/i }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível excluir a conta.', 'error'));
    expect(logout).not.toHaveBeenCalled();
  });
});
