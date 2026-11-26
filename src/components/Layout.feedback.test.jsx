import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: {} })), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  useToast.mockReturnValue({ showToast: vi.fn() });
});

// Mocks an authenticated user with the given roles and optional platform tier.
const setupUser = ({ roles, tier }) => {
  useAuth.mockReturnValue({
    user: {
      firstName: 'Ana',
      lastName: 'Lima',
      email: 'ana@example.com',
      platformPlan: tier ? { tier, status: 'ACTIVE' } : null,
    },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role),
  });
};

// Renders the layout with placeholder content inside a router.
const renderLayout = () => renderWithRouter(<Layout><span>Content</span></Layout>);

describe('Layout feedback widget', () => {
  it('renders the Enviar feedback trigger for a BETA trainer', () => {
    setupUser({ roles: ['TRAINER'], tier: 'BETA' });
    renderLayout();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toHaveClass('btn--primary');
    expect(screen.getByRole('button', { name: 'Enviar feedback' }).querySelector('.badge')).toBeNull();
  });

  it('does not render it for a non-BETA trainer', () => {
    setupUser({ roles: ['TRAINER'], tier: 'PRO' });
    renderLayout();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });

  it('does not render it for a student', () => {
    setupUser({ roles: ['STUDENT'], tier: 'BETA' });
    renderLayout();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });
});

describe('Layout admin nav', () => {
  it('reaches feedbacks through the single Manager link instead of a sidebar "Feedbacks" link for an admin', () => {
    setupUser({ roles: ['ADMIN'] });
    renderLayout();
    expect(screen.queryByRole('link', { name: 'Feedbacks' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Manager/ })).toHaveAttribute('href', '/manager');
  });

  it('hides the "Feedbacks" link from non-admins', () => {
    setupUser({ roles: ['TRAINER'], tier: 'PRO' });
    renderLayout();
    expect(screen.queryByRole('link', { name: 'Feedbacks' })).not.toBeInTheDocument();
  });
});
