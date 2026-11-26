import { screen, within, waitFor, renderWithRouter } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import api from '../api/axios';
import { SIDEBAR_BADGE_MAX } from '../constants/finance';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/AiChatContext', () => ({
  useAiChat: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const PENDING_URL = '/admin/manager/pending';
const OLD_ADMIN_LINKS = ['Convites do beta', 'Feedbacks', 'Trainers e planos', 'Uso do iArnold', 'Tutoriais'];

// Mocks an authenticated user holding the given roles.
const setupRoles = (roles) => {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role),
  });
};

// Answers the pending request with `pending` (or rejects when it is an Error) and every other request with {}.
const mockPending = (pending) => {
  api.get.mockImplementation((url) => {
    if (url !== PENDING_URL) return Promise.resolve({ data: {} });
    return pending instanceof Error ? Promise.reject(pending) : Promise.resolve({ data: pending });
  });
};

// Renders the layout with placeholder content.
const renderLayout = () => renderWithRouter(<Layout><span>Content</span></Layout>);

// The sidebar element.
const getSidebar = () => document.querySelector('.sidebar');

// The Manager link of the sidebar.
const managerLink = () => within(getSidebar()).getByRole('link', { name: /^Manager/ });

// Whether the pending counts were requested.
const pendingRequested = () => api.get.mock.calls.some(([url]) => url === PENDING_URL);

describe('Layout Administração: Manager link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
    mockPending({ pendingInvites: 0, newFeedbacks: 0 });
  });

  it('shows exactly one admin link, Manager to /manager, styled as a sidebar link', async () => {
    setupRoles(['ADMIN']);
    renderLayout();

    const sidebar = getSidebar();
    expect(within(sidebar).getByText('Administração')).toBeInTheDocument();
    expect(managerLink()).toHaveAttribute('href', '/manager');
    expect(managerLink()).toHaveClass('sidebar-link');
    const adminHrefs = within(sidebar)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href.startsWith('/admin') || href.startsWith('/manager'));
    expect(adminHrefs).toEqual(['/manager']);
    await waitFor(() => expect(pendingRequested()).toBe(true));
  });

  it('removes the five old admin links from the sidebar', async () => {
    setupRoles(['ADMIN']);
    renderLayout();

    await waitFor(() => expect(pendingRequested()).toBe(true));
    const sidebar = getSidebar();
    OLD_ADMIN_LINKS.forEach((name) => expect(within(sidebar).queryByRole('link', { name })).not.toBeInTheDocument());
  });

  it('shows the sum of pending invites and new feedbacks as a count badge in the accessible name', async () => {
    setupRoles(['ADMIN']);
    mockPending({ pendingInvites: 4, newFeedbacks: 2 });
    renderLayout();

    await waitFor(() => expect(managerLink().querySelector('.sidebar-link-badge')).toBeInTheDocument());
    const badge = managerLink().querySelector('.sidebar-link-badge');
    expect(badge).toHaveClass('sidebar-link-badge--count');
    expect(badge).toHaveTextContent(/^6$/);
    expect(managerLink()).toHaveAccessibleName(/Manager/);
    expect(managerLink()).toHaveAccessibleName(/\b6\b/);
  });

  it(`caps the badge at ${SIDEBAR_BADGE_MAX}+`, async () => {
    setupRoles(['ADMIN']);
    mockPending({ pendingInvites: SIDEBAR_BADGE_MAX, newFeedbacks: 5 });
    renderLayout();

    await waitFor(() => expect(managerLink().querySelector('.sidebar-link-badge')).toBeInTheDocument());
    expect(managerLink().querySelector('.sidebar-link-badge')).toHaveTextContent(`${SIDEBAR_BADGE_MAX}+`);
  });

  it('hides the badge when there is nothing pending', async () => {
    setupRoles(['ADMIN']);
    renderLayout();

    await waitFor(() => expect(pendingRequested()).toBe(true));
    expect(managerLink().querySelector('.sidebar-link-badge')).toBeNull();
    expect(managerLink()).toHaveAccessibleName('Manager');
  });

  it('keeps the Manager link without a badge when the pending request fails', async () => {
    setupRoles(['ADMIN']);
    mockPending(new Error('network'));
    renderLayout();

    await waitFor(() => expect(pendingRequested()).toBe(true));
    expect(managerLink()).toHaveAttribute('href', '/manager');
    expect(managerLink().querySelector('.sidebar-link-badge')).toBeNull();
  });

  it('hides the section from non-admins and does not request the pending counts', async () => {
    setupRoles(['TRAINER']);
    renderLayout();

    await screen.findByText('Treinador');
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Manager/ })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pendingRequested()).toBe(false);
  });
});
