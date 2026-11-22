import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import Layout from './Layout';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { useToast } from '../contexts/ToastContext';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const ORIGINAL_URL = window.location.href;
const UNREAD_COUNT_URL = '/trainer/student-feedbacks/unread-count';
const FEEDBACK_PATH = '/trainer/student-feedbacks';

// Mocks an authenticated user with the given roles (hasRole is case-insensitive like the real one)
const mockRoles = (roles) => {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', roles },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

// Answers the unread count request with the given number and rejects any other request
const mockUnreadCount = (count) => {
  api.get.mockImplementation((url) => {
    if (url === UNREAD_COUNT_URL) return Promise.resolve({ data: { count } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Points window.location at the production hostname through the jsdom instance
const setProductionHostname = () => {
  globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
};

// Renders the layout on the given route and returns the sidebar
const renderSidebar = (route = '/') => {
  renderWithRouter(<Layout><span>Content</span></Layout>, { route });
  return within(screen.getByRole('complementary'));
};

// Proves the link shows for a trainer on localhost, then unmounts and forgets the requests made
const expectLinkForTrainerThenUnmount = async (name) => {
  mockRoles(['TRAINER']);
  const view = renderWithRouter(<Layout><span>Content</span></Layout>);
  expect(await within(screen.getByRole('complementary')).findByRole('link', { name })).toBeInTheDocument();
  view.unmount();
  api.get.mockClear();
};

// Whether the layout asked the service for the unread count
const askedForUnreadCount = () => api.get.mock.calls.some(([url]) => url === UNREAD_COUNT_URL);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', false);
  useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  useToast.mockReturnValue({ showToast: vi.fn() });
  mockUnreadCount(0);
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
});

describe('Layout: student feedback sidebar item', () => {
  it('shows the "Feedback" link to a trainer, pointing at the inbox', async () => {
    mockRoles(['TRAINER']);
    const sidebar = renderSidebar();

    expect(await sidebar.findByRole('link', { name: 'Feedback' })).toHaveAttribute('href', FEEDBACK_PATH);
  });

  it('shows no count while nothing is unread', async () => {
    mockRoles(['TRAINER']);
    const sidebar = renderSidebar();

    const link = await sidebar.findByRole('link', { name: 'Feedback' });
    await waitFor(() => expect(askedForUnreadCount()).toBe(true));
    expect(within(link).queryByText('0')).not.toBeInTheDocument();
    expect(sidebar.getByRole('link', { name: 'Feedback' })).toBeInTheDocument();
  });

  it('shows the unread count in the count badge and in the accessible name', async () => {
    mockRoles(['TRAINER']);
    mockUnreadCount(3);
    const sidebar = renderSidebar();

    const link = await sidebar.findByRole('link', { name: 'Feedback, 3 não lidos' });
    const badge = within(link).getByText('3');
    expect(badge).toHaveClass('sidebar-link-badge');
    expect(badge).toHaveClass('sidebar-link-badge--count');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveAttribute('href', FEEDBACK_PATH);
  });

  it('uses the singular for one unread feedback', async () => {
    mockRoles(['TRAINER']);
    mockUnreadCount(1);
    const sidebar = renderSidebar();

    expect(await sidebar.findByRole('link', { name: 'Feedback, 1 não lido' })).toBeInTheDocument();
  });

  it('caps the badge at 99+ and keeps the real number in the accessible name', async () => {
    mockRoles(['TRAINER']);
    mockUnreadCount(150);
    const sidebar = renderSidebar();

    const link = await sidebar.findByRole('link', { name: 'Feedback, 150 não lidos' });
    expect(within(link).getByText('99+')).toHaveClass('sidebar-link-badge');
  });

  it('keeps the link without a count when the count request fails', async () => {
    mockRoles(['TRAINER']);
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar.' });
    const sidebar = renderSidebar();

    await waitFor(() => expect(askedForUnreadCount()).toBe(true));
    expect(await sidebar.findByRole('link', { name: 'Feedback' })).toBeInTheDocument();
    expect(useToast().showToast).not.toHaveBeenCalled();
  });

  it.each([FEEDBACK_PATH, `${FEEDBACK_PATH}/settings`])('marks the link as active on %s', async (route) => {
    mockRoles(['TRAINER']);
    const sidebar = renderSidebar(route);

    expect(await sidebar.findByRole('link', { name: 'Feedback' })).toHaveClass('sidebar-link--active');
  });

  it('is not active on another trainer page', async () => {
    mockRoles(['TRAINER']);
    const sidebar = renderSidebar('/trainer/students');

    expect(await sidebar.findByRole('link', { name: 'Feedback' })).not.toHaveClass('sidebar-link--active');
  });

  it('shows neither the link nor asks for the count for a user who is not a trainer', async () => {
    mockUnreadCount(3);
    await expectLinkForTrainerThenUnmount('Feedback, 3 não lidos');
    mockRoles(['STUDENT']);

    const sidebar = renderSidebar();

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(sidebar.queryByRole('link', { name: /^Feedback(,|$)/ })).not.toBeInTheDocument();
    expect(askedForUnreadCount()).toBe(false);
  });
});

describe('Layout: student feedback rollout gate', () => {
  it('shows the link to an admin trainer on the production hostname', async () => {
    mockRoles(['TRAINER', 'ADMIN']);
    mockUnreadCount(2);
    setProductionHostname();
    const sidebar = renderSidebar();

    expect(await sidebar.findByRole('link', { name: 'Feedback, 2 não lidos' })).toHaveAttribute('href', FEEDBACK_PATH);
  });

  it('hides the link and asks for no count for a non-admin trainer on the production hostname, unlike on localhost', async () => {
    mockUnreadCount(2);
    await expectLinkForTrainerThenUnmount('Feedback, 2 não lidos');
    setProductionHostname();

    const sidebar = renderSidebar();

    expect(sidebar.getAllByRole('link', { name: 'Meus Alunos' }).length).toBeGreaterThan(0);
    expect(sidebar.queryByRole('link', { name: /^Feedback(,|$)/ })).not.toBeInTheDocument();
    expect(askedForUnreadCount()).toBe(false);
  });
});
