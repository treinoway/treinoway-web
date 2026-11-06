import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../test/test-utils';
import FeedbackWidget from './FeedbackWidget';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const FLAG_KEY = 'treinoway:feedbackCallout:user-1';

// Mocks an authenticated user with the given roles and platform tier.
const setupUser = ({ roles = ['TRAINER'], tier = 'BETA' } = {}) => {
  useAuth.mockReturnValue({
    user: { id: 'user-1', firstName: 'Ana', platformPlan: tier ? { tier, status: 'ACTIVE' } : null },
    hasRole: (role) => roles.includes(role),
  });
};

// Renders the feedback widget inside a router.
const renderWidget = () => renderWithRouter(<FeedbackWidget />, { route: '/trainer/students' });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useToast.mockReturnValue({ showToast: vi.fn() });
  setupUser();
});

describe('FeedbackWidget beta callout', () => {
  it('shows the welcome callout for a BETA trainer without the flag', () => {
    const { container } = renderWidget();
    const callout = container.querySelector('.ds-callout');
    expect(callout).toBeInTheDocument();
    expect(within(callout).getByText('Conta pra gente o que está achando do Teufit!')).toBeInTheDocument();
    expect(within(callout).queryByText('Você faz parte do beta!')).toBeNull();
    expect(callout.textContent).not.toMatch(/beta/i);
  });

  it('hides the callout and sets the flag when closed', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();
    await user.click(within(container.querySelector('.ds-callout')).getByRole('button', { name: 'Fechar' }));
    expect(container.querySelector('.ds-callout')).not.toBeInTheDocument();
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
  });

  it('does not render when the flag is already set', () => {
    localStorage.setItem(FLAG_KEY, '1');
    const { container } = renderWidget();
    expect(container.querySelector('.ds-callout')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toBeInTheDocument();
  });

  it('hides the callout and sets the flag when the feedback popover opens', async () => {
    const user = userEvent.setup();
    const { container } = renderWidget();
    expect(container.querySelector('.ds-callout')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar feedback' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(container.querySelector('.ds-callout')).not.toBeInTheDocument();
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
  });

  it('never shows for non-BETA users', () => {
    setupUser({ tier: 'PRO' });
    const { container } = renderWidget();
    expect(container.querySelector('.ds-callout')).not.toBeInTheDocument();
    expect(screen.queryByText('Você faz parte do beta!')).not.toBeInTheDocument();
  });
});
