import { screen, waitFor, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserDetail from './UserDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const trainerOverview = {
  user: {
    id: 'u1',
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'ana@example.com',
    roles: ['trainer'],
    status: 'ACTIVE',
    createdAt: '2026-10-01T12:00:00.000Z',
    deletedAt: null,
  },
  trainer: { id: 't1', createdAt: '2026-10-01T12:00:00.000Z', planTier: 'PRO' },
  counts: {
    students: 7,
    activeStudents: 5,
    protocolsCreated: 11,
    trainingTemplates: 3,
    exerciseTemplates: 4,
    challenges: 2,
    trainers: 0,
    protocolsAssigned: 0,
    workoutSessions: 9,
  },
  lastWorkoutAt: null,
};

const studentOverview = {
  ...trainerOverview,
  user: { ...trainerOverview.user, id: 'u2', firstName: 'Caio', lastName: 'Souza', email: 'caio@example.com', roles: [] },
  trainer: null,
  counts: { ...trainerOverview.counts, students: 0, protocolsCreated: 0, trainers: 1, protocolsAssigned: 2 },
};

// Builds a paginated response for the given rows.
const page = (items) => ({ data: { items, total: items.length, page: 1, pageSize: 20 } });

const studentRow = {
  studentId: 's1',
  firstName: 'Maria',
  lastName: 'Aluna',
  email: 'maria@example.com',
  status: 'ACTIVE',
  activeOnPlan: true,
  lastWorkoutAt: null,
  linkedAt: '2026-10-05T12:00:00.000Z',
};

const protocolRow = {
  id: 'p1',
  name: 'Hipertrofia A',
  trainerName: 'Ana Silva',
  assigneeName: 'Maria Aluna',
  startDate: '2026-10-01',
  endDate: '2026-11-01',
  trainingsCount: 3,
  createdAt: '2026-10-01T12:00:00.000Z',
  deletedAt: null,
};

// Answers api.get by URL for the given overview.
const mockApi = (overview) => {
  api.get.mockImplementation((url) => {
    if (url.endsWith('/students')) return Promise.resolve(page([studentRow]));
    if (url.endsWith('/trainers'))
      return Promise.resolve(
        page([{ trainerId: 't9', userId: 'u9', firstName: 'Paulo', lastName: 'Coach', email: 'paulo@example.com', status: 'ACTIVE', linkedAt: '2026-10-05T12:00:00.000Z' }])
      );
    if (url.endsWith('/protocols')) return Promise.resolve(page([protocolRow]));
    if (url.endsWith('/templates'))
      return Promise.resolve(page([{ id: 'tpl1', name: 'Treino Peito', createdAt: '2026-10-01T12:00:00.000Z', deletedAt: null }]));
    if (url.endsWith('/sessions'))
      return Promise.resolve(page([{ id: 'ss1', trainingName: 'Treino Costas', startedAt: '2026-10-06T12:00:00.000Z', finishedAt: '2026-10-06T13:00:00.000Z', durationSec: 3600 }]));
    return Promise.resolve({ data: overview });
  });
};

// Renders the detail page with probe routes to observe navigation.
const renderDetail = (userId = 'u1') =>
  render(
    <MemoryRouter initialEntries={[`/manager/users/${userId}`]}>
      <Routes>
        <Route path="/manager" element={<div>Users list route</div>} />
        <Route path="/manager/users/:userId" element={<UserDetail />} />
        <Route path="/manager/protocols/:protocolId" element={<div>Protocol route p</div>} />
      </Routes>
    </MemoryRouter>
  );

// Lists the URLs requested so far.
const requestedUrls = () => api.get.mock.calls.map((call) => call[0]);

describe('UserDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockApi(trainerOverview);
  });

  it('fetches the user overview by id', async () => {
    renderDetail();

    await waitFor(() => expect(requestedUrls()).toContain('/admin/manager/users/u1'));
  });

  it('renders the header with name, email and role badge, plus a ghost back button to /manager', async () => {
    const user = userEvent.setup();
    const { container } = renderDetail();

    expect(await screen.findByRole('heading', { name: /Ana Silva/ })).toBeInTheDocument();
    expect(screen.getAllByText('ana@example.com').length).toBeGreaterThan(0);
    expect(container.querySelector('.badge')).toBeInTheDocument();
    const back = container.querySelector('.btn.btn--ghost');
    expect(back).toBeInTheDocument();

    await user.click(back);

    expect(await screen.findByText('Users list route')).toBeInTheDocument();
  });

  it('shows the counts as MetricCards', async () => {
    const { container } = renderDetail();

    await screen.findByRole('heading', { name: /Ana Silva/ });
    const cards = container.querySelectorAll('.metric-card');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    const values = Array.from(container.querySelectorAll('.metric-card-value')).map((node) => node.textContent);
    expect(values).toEqual(expect.arrayContaining(['7', '11', '9']));
    expect(container.querySelector('.metric-card-label')).toBeInTheDocument();
  });

  it('shows the trainer tabs in a Segmented tablist', async () => {
    const { container } = renderDetail();

    await screen.findByRole('heading', { name: /Ana Silva/ });
    expect(container.querySelector('.segmented')).toBeInTheDocument();
    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getByRole('tab', { name: /Alunos/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Rotinas criadas/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Templates/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Sessões/ })).toBeInTheDocument();
  });

  it('hides trainer-only tabs for a non-trainer and shows the student tabs', async () => {
    mockApi(studentOverview);
    renderDetail('u2');

    await screen.findByRole('heading', { name: /Caio Souza/ });
    const tablist = screen.getByRole('tablist');
    expect(within(tablist).queryByRole('tab', { name: /Alunos/ })).not.toBeInTheDocument();
    expect(within(tablist).queryByRole('tab', { name: /Rotinas criadas/ })).not.toBeInTheDocument();
    expect(within(tablist).queryByRole('tab', { name: /Templates/ })).not.toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Rotinas recebidas/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Treinadores/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Sessões/ })).toBeInTheDocument();
  });

  it('fetches only the selected tab endpoint, lazily, for a trainer', async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText('Maria Aluna');

    expect(requestedUrls()).toContain('/admin/manager/users/u1/students');
    expect(requestedUrls()).not.toContain('/admin/manager/users/u1/protocols');
    expect(requestedUrls()).not.toContain('/admin/manager/users/u1/templates');
    expect(requestedUrls()).not.toContain('/admin/manager/users/u1/sessions');

    await user.click(screen.getByRole('tab', { name: /Rotinas criadas/ }));
    await waitFor(() => expect(requestedUrls()).toContain('/admin/manager/users/u1/protocols'));
    const protocolsCall = api.get.mock.calls.find((call) => call[0].endsWith('/protocols'));
    expect(protocolsCall[1].params).toEqual(expect.objectContaining({ as: 'trainer', page: 1 }));
    expect(requestedUrls()).not.toContain('/admin/manager/users/u1/templates');

    await user.click(screen.getByRole('tab', { name: /Templates/ }));
    await waitFor(() => expect(requestedUrls()).toContain('/admin/manager/users/u1/templates'));
    const templatesCall = api.get.mock.calls.find((call) => call[0].endsWith('/templates'));
    expect(templatesCall[1].params).toEqual(expect.objectContaining({ type: 'training' }));

    await user.click(screen.getByRole('tab', { name: /Sessões/ }));
    await waitFor(() => expect(requestedUrls()).toContain('/admin/manager/users/u1/sessions'));
    expect(await screen.findByText('Treino Costas')).toBeInTheDocument();
  });

  it('fetches received routines with as=student and trainers for a student', async () => {
    const user = userEvent.setup();
    mockApi(studentOverview);
    renderDetail('u2');
    await screen.findByRole('heading', { name: /Caio Souza/ });

    await user.click(screen.getByRole('tab', { name: /Rotinas recebidas/ }));
    await waitFor(() => {
      const call = api.get.mock.calls.find((c) => c[0].endsWith('/protocols'));
      expect(call[1].params).toEqual(expect.objectContaining({ as: 'student' }));
    });

    await user.click(screen.getByRole('tab', { name: /Treinadores/ }));
    expect(await screen.findByText('Paulo Coach')).toBeInTheDocument();
    expect(requestedUrls()).toContain('/admin/manager/users/u2/trainers');
  });

  it('renders each tab content in an admin table', async () => {
    const user = userEvent.setup();
    const { container } = renderDetail();

    await screen.findByText('Maria Aluna');
    expect(container.querySelector('table.admin-table')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Rotinas criadas/ }));
    await screen.findByText('Hipertrofia A');
    expect(container.querySelector('table.admin-table')).toBeInTheDocument();
  });

  it('navigates to the student manager detail when a student row is clicked', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByText('Maria Aluna'));

    expect(await screen.findByRole('heading', { name: /Ana Silva/ })).toBeInTheDocument();
    await waitFor(() => expect(requestedUrls()).toContain('/admin/manager/users/s1'));
  });

  it('navigates to /manager/protocols/:id when a routine row is clicked', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(await screen.findByRole('tab', { name: /Rotinas criadas/ }));

    await user.click(await screen.findByText('Hipertrofia A'));

    expect(await screen.findByText('Protocol route p')).toBeInTheDocument();
  });

  it('shows error.userMessage when the overview request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Usuário não encontrado' });

    renderDetail();

    expect(await screen.findByText('Usuário não encontrado')).toBeInTheDocument();
  });

  it('shows SkeletonRows while a tab is loading', async () => {
    api.get.mockImplementation((url) =>
      url.endsWith('/students') ? new Promise(() => {}) : Promise.resolve({ data: trainerOverview })
    );

    const { container } = renderDetail();

    await screen.findByRole('heading', { name: /Ana Silva/ });
    await waitFor(() => expect(container.querySelector('.skeleton-rows')).toBeInTheDocument());
  });

  it('shows an EmptyBlock when a tab has no rows', async () => {
    api.get.mockImplementation((url) =>
      url.endsWith('/students') ? Promise.resolve(page([])) : Promise.resolve({ data: trainerOverview })
    );

    const { container } = renderDetail();

    await waitFor(() => expect(container.querySelector('.empty-block')).toBeInTheDocument());
  });
});
