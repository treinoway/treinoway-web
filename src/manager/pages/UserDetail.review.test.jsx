import { screen, waitFor, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserDetail from './UserDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const overview = {
  user: { id: 'u1', firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', roles: ['trainer'], deletedAt: null },
  trainer: { id: 't1' },
  counts: {
    students: 1,
    activeStudents: 1,
    protocolsCreated: 40,
    trainingTemplates: 0,
    exerciseTemplates: 0,
    challenges: 0,
    trainers: 0,
    protocolsAssigned: 40,
    workoutSessions: 0,
  },
};

const row = { id: 'p1', name: 'Rotina', trainingsCount: 1, startDate: '2026-10-01', endDate: null, deletedAt: null };

describe('UserDetail tab state', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((url) => {
      if (url.endsWith('/protocols')) return Promise.resolve({ data: { items: [row], total: 40, page: 1, pageSize: 20 } });
      if (url.endsWith('/students')) return Promise.resolve({ data: { items: [], total: 0 } });
      return Promise.resolve({ data: overview });
    });
  });

  it('resets to page 1 when switching between the created and received tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/manager/users/u1']}>
        <Routes>
          <Route path="/manager/users/:userId" element={<UserDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(await screen.findByRole('tab', { name: /criadas/i }));
    await user.click(await screen.findByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params.page).toBe(2));

    await user.click(screen.getByRole('tab', { name: /recebidas/i }));

    await waitFor(() => {
      const last = api.get.mock.calls.at(-1);
      expect(last[1].params).toMatchObject({ as: 'student', page: 1 });
    });
  }, 30000);
});
