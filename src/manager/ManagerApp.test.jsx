import { screen, render, waitFor } from '../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ManagerApp from './ManagerApp';
import api from '../api/axios';
import { buildZeroOverview } from '../test/managerOverviewFixtures';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../pages/admin/TrainersList', () => ({ default: () => <div>Trainers Page</div> }));
vi.mock('../pages/admin/InvitesList', () => ({ default: () => <div>Invites Page</div> }));
vi.mock('../pages/admin/FeedbackList', () => ({ default: () => <div>Feedbacks Page</div> }));
vi.mock('../pages/admin/AiUsage', () => ({ default: () => <div>AiUsage Page</div> }));
vi.mock('../pages/admin/TutorialsList', () => ({ default: () => <div>Tutorials Page</div> }));

const PENDING_URL = '/admin/manager/pending';
const OVERVIEW_URL = '/admin/manager/overview';
const EMPTY_PAGE = { items: [], total: 0, page: 1, pageSize: 20 };

// Answers pending and overview by URL and every other request with an empty page.
const mockRequests = (extra = {}) => {
  api.get.mockImplementation((url) => {
    if (url in extra) return Promise.resolve({ data: extra[url] });
    if (url === PENDING_URL) return Promise.resolve({ data: { pendingInvites: 0, newFeedbacks: 0 } });
    if (url === OVERVIEW_URL) return Promise.resolve({ data: buildZeroOverview() });
    return Promise.resolve({ data: EMPTY_PAGE });
  });
};

// Renders the manager subtree at `route`.
const renderManager = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/manager/*" element={<ManagerApp />} />
      </Routes>
    </MemoryRouter>
  );

// URLs requested so far, ignoring the side-nav pending counts.
const pageRequests = () => api.get.mock.calls.map(([url]) => url).filter((url) => url !== PENDING_URL);

describe('ManagerApp', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockRequests();
  });

  it('renders the overview at the index inside the manager layout', async () => {
    renderManager('/manager');

    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(OVERVIEW_URL, { params: { period: '30d' } });
    expect(pageRequests()).not.toContain('/admin/manager/users');
  });

  it('renders the users list at /manager/users', async () => {
    renderManager('/manager/users');

    expect(await screen.findByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument();
    expect(pageRequests()[0]).toBe('/admin/manager/users');
  });

  it('redirects unknown paths to the overview', async () => {
    renderManager('/manager/nope');

    expect(await screen.findByRole('heading', { level: 1, name: 'Visão geral' })).toBeInTheDocument();
    await waitFor(() => expect(pageRequests()).toContain(OVERVIEW_URL));
  });

  it.each([
    ['trainers', 'Trainers Page'],
    ['invites', 'Invites Page'],
    ['feedbacks', 'Feedbacks Page'],
    ['ai-usage', 'AiUsage Page'],
    ['tutorials', 'Tutorials Page'],
  ])('renders the admin page at /manager/%s inside the manager layout', async (path, text) => {
    renderManager(`/manager/${path}`);

    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Visão geral/ })).toHaveAttribute('href', '/manager');
  });

  it('renders the session detail page at sessions/:sessionId', async () => {
    mockRequests({
      '/admin/manager/sessions/s1': {
        id: 's1',
        status: 'completed',
        startedAt: '2026-10-06T12:00:00.000Z',
        finishedAt: '2026-10-06T13:00:00.000Z',
        durationSec: 3600,
        notes: null,
        deletedAt: null,
        training: { id: 'tr1', name: 'Treino A - Peito' },
        student: { id: 'u2', firstName: 'Maria', lastName: 'Aluna', email: 'maria@example.com' },
        exerciseLogs: [],
      },
    });

    renderManager('/manager/sessions/s1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' })).toBeInTheDocument();
    expect(pageRequests()).toEqual(['/admin/manager/sessions/s1']);
  });
});
