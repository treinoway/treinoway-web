import { screen, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { SessionsTab } from './UserTabs';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const activeSession = {
  id: 'ss1',
  trainingName: 'Treino Costas',
  startedAt: '2026-10-06T12:00:00.000Z',
  finishedAt: '2026-10-06T13:00:00.000Z',
  durationSec: 3600,
  deletedAt: null,
};

const deletedSession = {
  id: 'ss2',
  trainingName: 'Treino Pernas',
  startedAt: '2026-10-04T12:00:00.000Z',
  finishedAt: '2026-10-04T13:00:00.000Z',
  durationSec: 3000,
  deletedAt: '2026-10-05T12:00:00.000Z',
};

// Probe page that shows which session id the router landed on.
const SessionProbe = () => {
  const { sessionId } = useParams();
  return <div>{`Session route ${sessionId}`}</div>;
};

// Renders the Sessões tab under the user route with a probe route for the session detail.
const renderSessionsTab = () =>
  render(
    <MemoryRouter initialEntries={['/manager/users/u1']}>
      <Routes>
        <Route path="/manager/users/:userId" element={<SessionsTab userId="u1" />} />
        <Route path="/manager/sessions/:sessionId" element={<SessionProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe('SessionsTab rows link to the session detail', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({
      data: { items: [activeSession, deletedSession], total: 2, page: 1, pageSize: 20 },
    });
  });

  it('renders each session row as a clickable manager row with a name button', async () => {
    renderSessionsTab();

    const nameButton = await screen.findByRole('button', { name: 'Treino Costas' });
    expect(nameButton).toHaveClass('manager-row-link');
    expect(nameButton.closest('tr')).toHaveClass('manager-row--link');
    expect(screen.getByRole('button', { name: /Treino Pernas/ })).toHaveClass('manager-row-link');
  });

  it('navigates to /manager/sessions/:id when the row is clicked', async () => {
    const user = userEvent.setup();
    renderSessionsTab();
    const nameButton = await screen.findByRole('button', { name: 'Treino Costas' });
    const row = nameButton.closest('tr');

    await user.click(within(row).getAllByRole('cell')[1]);

    expect(await screen.findByText('Session route ss1')).toBeInTheDocument();
  });

  it('navigates to /manager/sessions/:id when Enter is pressed on the name button', async () => {
    const user = userEvent.setup();
    renderSessionsTab();
    const nameButton = await screen.findByRole('button', { name: 'Treino Costas' });

    nameButton.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Session route ss1')).toBeInTheDocument();
  });

  it('shows the "Excluído" error Badge only on soft-deleted sessions', async () => {
    renderSessionsTab();
    const deletedButton = await screen.findByRole('button', { name: /Treino Pernas/ });
    const deletedRow = deletedButton.closest('tr');
    const activeRow = screen.getByRole('button', { name: 'Treino Costas' }).closest('tr');

    const badge = within(deletedRow).getByText('Excluído');
    expect(badge).toHaveClass('badge', 'badge--error');
    expect(within(activeRow).queryByText('Excluído')).not.toBeInTheDocument();
  });

  it('still opens the detail of a soft-deleted session', async () => {
    const user = userEvent.setup();
    renderSessionsTab();

    await user.click(await screen.findByRole('button', { name: /Treino Pernas/ }));

    expect(await screen.findByText('Session route ss2')).toBeInTheDocument();
  });
});
