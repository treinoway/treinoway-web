import { screen, render } from '../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ManagerApp from './ManagerApp';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('ManagerApp', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20 } });
  });

  it('renders the users list at the index inside the manager layout', async () => {
    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route path="/manager/*" element={<ManagerApp />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users');
  });

  it('redirects unknown paths to the users list', async () => {
    render(
      <MemoryRouter initialEntries={['/manager/nope']}>
        <Routes>
          <Route path="/manager/*" element={<ManagerApp />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1 });
    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users');
  });

  it('renders the session detail page at sessions/:sessionId', async () => {
    api.get.mockImplementation((url) =>
      url === '/admin/manager/sessions/s1'
        ? Promise.resolve({
            data: {
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
          })
        : Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 20 } })
    );

    render(
      <MemoryRouter initialEntries={['/manager/sessions/s1']}>
        <Routes>
          <Route path="/manager/*" element={<ManagerApp />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' })).toBeInTheDocument();
    expect(api.get.mock.calls.map((call) => call[0])).toEqual(['/admin/manager/sessions/s1']);
  });
});
