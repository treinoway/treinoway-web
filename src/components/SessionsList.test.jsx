import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import SessionsList from './SessionsList';

const sessions = [
  { id: 'a', trainingName: 'Upper', status: 'completed', startedAt: '2026-09-21T15:00:00Z', durationSeconds: 3300, avgRpe: 7 },
  { id: 'b', trainingName: 'Lower', status: 'abandoned', startedAt: '2026-09-18T15:00:00Z', durationSeconds: null, avgRpe: null },
];

// Renders SessionsList with default props and returns the handlers.
const renderList = (props = {}) => {
  const handlers = { onRetry: vi.fn(), onOpen: vi.fn() };
  render(<SessionsList sessions={sessions} loading={false} error={null} {...handlers} {...props} />);
  return handlers;
};

describe('SessionsList', () => {
  it('shows a loading status while fetching with no data', () => {
    renderList({ sessions: [], loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Sem sessões no período.')).not.toBeInTheDocument();
  });

  it('keeps rendering rows while reloading with existing data', () => {
    renderList({ loading: true });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the error and retries on click', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderList({ sessions: [], error: 'fail' });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar sessões');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('prefers the error over the loading skeleton', () => {
    renderList({ sessions: [], loading: true, error: 'fail' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    renderList({ sessions: [] });
    expect(screen.getByText('Sem sessões no período.')).toBeInTheDocument();
  });

  it('renders one row per session', () => {
    renderList();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Upper')).toBeInTheDocument();
    expect(screen.getByText('Lower')).toBeInTheDocument();
  });

  it('calls onOpen with the clicked session', async () => {
    const user = userEvent.setup();
    const { onOpen } = renderList();
    await user.click(screen.getByRole('button', { name: /abrir sessão lower/i }));
    expect(onOpen).toHaveBeenCalledWith(sessions[1]);
  });
});
