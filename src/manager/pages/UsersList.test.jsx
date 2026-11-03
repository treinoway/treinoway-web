import { screen, waitFor, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UsersList from './UsersList';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const ana = {
  id: 'u1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@example.com',
  roles: ['trainer'],
  isTrainer: true,
  isStudent: false,
  status: 'ACTIVE',
  createdAt: '2026-10-01T12:00:00.000Z',
  deletedAt: null,
};

const bruno = {
  id: 'u2',
  firstName: 'Bruno',
  lastName: 'Lima',
  email: 'bruno@example.com',
  roles: ['admin'],
  isTrainer: false,
  isStudent: true,
  status: 'ACTIVE',
  createdAt: '2026-10-02T12:00:00.000Z',
  deletedAt: null,
};

// Builds a paginated users response.
const buildResponse = (items = [ana, bruno], extra = {}) => ({
  data: { items, total: items.length, page: 1, pageSize: 20, ...extra },
});

// Renders the list with a probe route to observe navigation.
const renderList = () =>
  render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={<UsersList />} />
        <Route path="/manager/users/:userId" element={<div>User detail route</div>} />
      </Routes>
    </MemoryRouter>
  );

// Returns the params of the most recent users request.
const lastParams = () => api.get.mock.calls.at(-1)[1].params;

describe('UsersList', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue(buildResponse());
  });

  it('fetches /admin/manager/users on mount with page 1', async () => {
    renderList();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users');
    expect(api.get.mock.calls[0][1].params).toEqual(expect.objectContaining({ page: 1 }));
  });

  it('renders users in an admin table with name, email, role badges and created date', async () => {
    const { container } = renderList();

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    const table = container.querySelector('table.admin-table');
    expect(table).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Ana Silva/ });
    expect(within(row).getAllByText('ana@example.com').length).toBeGreaterThan(0);
    expect(row.querySelectorAll('.badge').length).toBeGreaterThan(0);
    expect(within(row).getByText(/treinador/i)).toBeInTheDocument();
    expect(within(row).getByText(/01\/10\/2026|2026-10-01|1 de out/i)).toBeInTheDocument();
    const adminRow = screen.getByRole('row', { name: /Bruno Lima/ });
    expect(within(adminRow).getByText(/admin/i)).toBeInTheDocument();
  });

  it('renders the search input with the design-system search class', async () => {
    const { container } = renderList();

    await screen.findByText('Ana Silva');
    const input = container.querySelector('input.input.input--search');
    expect(input).toBeInTheDocument();
    expect(input).toBe(screen.getByRole('textbox'));
  });

  it('debounces the search and refetches with the typed term on page 1', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText('Ana Silva');
    const callsBefore = api.get.mock.calls.length;

    await user.type(screen.getByRole('textbox'), 'bru');

    expect(api.get.mock.calls.length).toBe(callsBefore);
    await waitFor(() => expect(lastParams()).toEqual(expect.objectContaining({ search: 'bru', page: 1 })), {
      timeout: 2000,
    });
    expect(api.get.mock.calls.length).toBe(callsBefore + 1);
  });

  it('filters by kind through a Segmented tablist and sends the kind param', async () => {
    const user = userEvent.setup();
    const { container } = renderList();
    await screen.findByText('Ana Silva');

    expect(container.querySelector('.segmented')).toBeInTheDocument();
    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tablist).getByRole('tab', { name: 'Treinadores' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Alunos' })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: 'Admins' })).toBeInTheDocument();

    await user.click(within(tablist).getByRole('tab', { name: 'Treinadores' }));

    await waitFor(() => expect(lastParams()).toEqual(expect.objectContaining({ kind: 'trainer', page: 1 })));
    expect(screen.getByRole('tab', { name: 'Treinadores' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sends kind=student and kind=admin for the other filters', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText('Ana Silva');

    await user.click(screen.getByRole('tab', { name: 'Alunos' }));
    await waitFor(() => expect(lastParams()).toEqual(expect.objectContaining({ kind: 'student' })));

    await user.click(screen.getByRole('tab', { name: 'Admins' }));
    await waitFor(() => expect(lastParams()).toEqual(expect.objectContaining({ kind: 'admin' })));
  });

  it('paginates inside a .pagination-row and requests the next page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(buildResponse([ana, bruno], { total: 45, page: 1, pageSize: 20 }));
    const { container } = renderList();
    await screen.findByText('Ana Silva');

    const paginationRow = container.querySelector('.pagination-row');
    expect(paginationRow).toBeInTheDocument();
    const buttons = within(paginationRow).getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(lastParams()).toEqual(expect.objectContaining({ page: 2 })));
  });

  it('navigates to /manager/users/:id when a row is clicked', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByText('Ana Silva'));

    expect(await screen.findByText('User detail route')).toBeInTheDocument();
  });

  it('shows SkeletonRows while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { container } = renderList();

    expect(container.querySelector('.skeleton-rows')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(container.querySelectorAll('.row-skeleton').length).toBeGreaterThan(0);
  });

  it('shows an EmptyBlock when there are no users', async () => {
    api.get.mockResolvedValue(buildResponse([]));

    const { container } = renderList();

    await waitFor(() => expect(container.querySelector('.empty-block')).toBeInTheDocument());
    expect(container.querySelector('table.admin-table')).not.toBeInTheDocument();
  });

  it('shows error.userMessage when the request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Consulta demorou demais' });

    renderList();

    expect(await screen.findByText('Consulta demorou demais')).toBeInTheDocument();
  });
});
