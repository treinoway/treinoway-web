import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import FeedbackWidget from './FeedbackWidget';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

// Mocks an authenticated user with the given roles and platform tier.
const setupUser = ({ roles = ['TRAINER'], tier = 'BETA' } = {}) => {
  useAuth.mockReturnValue({
    user: { id: 'user-1', firstName: 'Ana', email: 'ana@example.com', platformPlan: tier ? { tier, status: 'ACTIVE' } : null },
    hasRole: (role) => roles.includes(role),
  });
};

// Renders the feedback widget inside a router at the given route.
const renderWidget = (route = '/trainer/students') => renderWithRouter(<FeedbackWidget />, { route });

// Opens the feedback popover by clicking the trigger button.
const openPopover = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Enviar feedback' }));
  return screen.getByRole('dialog');
};

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
  setupUser();
});

describe('FeedbackWidget visibility', () => {
  it('renders an icon-only round trigger for a BETA trainer, styled as btn--primary, with no text or badge', () => {
    renderWidget();
    const trigger = screen.getByRole('button', { name: 'Enviar feedback' });
    expect(trigger).toHaveAttribute('aria-label', 'Enviar feedback');
    expect(trigger).toHaveClass('btn', 'btn--primary', 'feedback-widget__trigger');
    expect(trigger).not.toHaveClass('btn--secondary');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
    expect(trigger.querySelector('.badge')).toBeNull();
    expect(within(trigger).queryByText(/beta/i)).toBeNull();
    expect(trigger).toHaveTextContent('');
  });

  it('positions the widget bottom-right via the feedback-widget--right modifier', () => {
    const { container } = renderWidget();
    expect(container.querySelector('.feedback-widget')).toHaveClass('feedback-widget--right');
  });

  it('renders nothing for a non-BETA trainer', () => {
    setupUser({ tier: 'PRO' });
    const { container } = renderWidget();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a trainer without a platform plan', () => {
    setupUser({ tier: null });
    renderWidget();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });

  it('renders nothing for a student or admin-only user even with BETA tier', () => {
    setupUser({ roles: ['STUDENT'] });
    const { container, unmount } = renderWidget();
    expect(container).toBeEmptyDOMElement();
    unmount();
    setupUser({ roles: ['ADMIN'] });
    renderWidget();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });
});

describe('FeedbackWidget popover', () => {
  it('opens a Popover with title, Segmented defaulting to Sugestão, textarea and counter', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const dialog = await openPopover(user);
    expect(dialog).toHaveAccessibleName(/conte pra gente/i);
    expect(container.ownerDocument.querySelector('.ds-popover')).toBeInTheDocument();

    expect(document.querySelector('.segmented')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Problema' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Sugestão' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Elogio' })).toHaveAttribute('aria-selected', 'false');

    const textarea = screen.getByLabelText('Mensagem');
    expect(textarea).toHaveClass('form-textarea');
    expect(textarea).toHaveAttribute('maxlength', '2000');
    expect(document.querySelector('.field-hint')).toHaveTextContent('0/2000');
    expect(document.querySelector('.icon-button')).toBe(screen.getByRole('button', { name: 'Fechar' }));
  });

  it('keeps Enviar (btn--primary) disabled while the message is empty or whitespace', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openPopover(user);
    const send = screen.getByRole('button', { name: 'Enviar' });
    expect(send).toHaveClass('btn', 'btn--primary');
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Mensagem'), '   ');
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Mensagem'), 'oi');
    expect(send).toBeEnabled();
  });

  it('updates the character counter while typing', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openPopover(user);
    await user.type(screen.getByLabelText('Mensagem'), 'abcde');
    expect(document.querySelector('.field-hint')).toHaveTextContent('5/2000');
  });

  it('closes on Escape and returns focus to the pill', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openPopover(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toHaveFocus();
  });

  it('closes via the X button and returns focus to the pill', async () => {
    const user = userEvent.setup();
    renderWidget();
    await openPopover(user);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toHaveFocus();
  });
});

describe('FeedbackWidget submit', () => {
  it('posts category, message, pagePath and viewport, then toasts, closes and resets', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 'f1', createdAt: '2026-11-04T10:00:00.000Z' } });
    renderWidget('/trainer/routines');
    await openPopover(user);
    await user.click(screen.getByRole('tab', { name: 'Problema' }));
    await user.type(screen.getByLabelText('Mensagem'), 'Botão quebrado');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/trainer/feedback', {
      category: 'BUG',
      message: 'Botão quebrado',
      pagePath: '/trainer/routines',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Obrigado pelo feedback!', 'success'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openPopover(user);
    expect(screen.getByLabelText('Mensagem')).toHaveValue('');
    expect(screen.getByRole('tab', { name: 'Sugestão' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sends SUGGESTION by default and PRAISE when Elogio is chosen', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 'f1' } });
    renderWidget();
    await openPopover(user);
    await user.type(screen.getByLabelText('Mensagem'), 'ideia');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trainer/feedback', expect.objectContaining({ category: 'SUGGESTION' })));

    await openPopover(user);
    await user.click(screen.getByRole('tab', { name: 'Elogio' }));
    await user.type(screen.getByLabelText('Mensagem'), 'adorei');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith('/trainer/feedback', expect.objectContaining({ category: 'PRAISE' })));
  });

  it('shows "Enviando..." and disables the button while the request is pending', async () => {
    const user = userEvent.setup();
    let resolve;
    api.post.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderWidget();
    await openPopover(user);
    await user.type(screen.getByLabelText('Mensagem'), 'texto');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    const sending = await screen.findByRole('button', { name: 'Enviando...' });
    expect(sending).toBeDisabled();
    resolve({ data: { id: 'f1' } });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('on error toasts userMessage, stays open and keeps the text', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ userMessage: 'Muitas tentativas. Aguarde.' });
    renderWidget();
    await openPopover(user);
    await user.type(screen.getByLabelText('Mensagem'), 'meu texto');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Muitas tentativas. Aguarde.', 'error'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensagem')).toHaveValue('meu texto');
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });
});
