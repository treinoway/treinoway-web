import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import { render, screen, waitFor } from '../test/test-utils';
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

// Renders the widget inside a router with a link to navigate away.
const renderAt = (route) => render(
  <MemoryRouter initialEntries={[route]}>
    <Link to="/trainer/other">go</Link>
    <FeedbackWidget />
  </MemoryRouter>
);

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: vi.fn() });
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', platformPlan: { tier: 'BETA', status: 'ACTIVE' } },
    hasRole: (role) => role === 'TRAINER',
  });
  api.post.mockResolvedValue({ data: {} });
});

describe('FeedbackWidget review fixes', () => {
  it('does not render on the AI assistant page', () => {
    renderAt('/trainer/ai-assistant');
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });

  it('closes the popover when the route changes', async () => {
    const user = userEvent.setup();
    renderAt('/trainer/students');
    await user.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'go' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends the pagePath captured when the popover opened, sliced to 300 chars', async () => {
    const user = userEvent.setup();
    renderAt(`/trainer/${'a'.repeat(400)}`);
    await user.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    await user.type(screen.getByRole('textbox'), 'ola');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const body = api.post.mock.calls[0][1];
    expect(body.pagePath).toHaveLength(300);
    expect(body.pagePath.startsWith('/trainer/aaa')).toBe(true);
  });
});
