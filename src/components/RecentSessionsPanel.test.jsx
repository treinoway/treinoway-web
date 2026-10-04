import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen } from '../test/test-utils';
import RecentSessionsPanel from './RecentSessionsPanel';

const mockSessions = [
  {
    id: 'sess-1',
    trainingId: 'tr-1',
    trainingName: 'Upper - ênfase em costas',
    status: 'completed',
    startedAt: '2026-09-21T13:00:00Z',
    finishedAt: '2026-09-21T14:00:00Z',
    durationSeconds: 3300,
    avgRpe: 7.5,
    noteText: null,
  },
  {
    id: 'sess-2',
    trainingId: 'tr-2',
    trainingName: 'Lower - ênfase em posterior',
    status: 'abandoned',
    startedAt: '2026-09-18T13:00:00Z',
    finishedAt: null,
    durationSeconds: null,
    avgRpe: null,
    noteText: 'Dor no joelho',
  },
];

const renderPanel = (props = {}) => {
  const handlers = { onViewAll: vi.fn(), onRetry: vi.fn(), onOpen: vi.fn() };
  renderWithRouter(
    <RecentSessionsPanel sessions={mockSessions} loading={false} error={null} {...handlers} {...props} />,
  );
  return handlers;
};

describe('RecentSessionsPanel', () => {
  it('renders the card heading', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Sessões recentes' })).toBeInTheDocument();
  });

  it('renders one row per session with a date block', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /abrir sessão upper - ênfase em costas de 21 set/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir sessão lower - ênfase em posterior de 18 set/i })).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('shows duration and RPE from the API fields', () => {
    renderPanel();
    expect(screen.getByText('55 min · RPE 7,5')).toBeInTheDocument();
  });

  it('flags abandoned sessions with a status badge', () => {
    renderPanel();
    expect(screen.getByText('Abandonado')).toBeInTheDocument();
  });

  it('opens a session on row click', async () => {
    const user = userEvent.setup();
    const { onOpen } = renderPanel();
    await user.click(screen.getByRole('button', { name: /abrir sessão upper/i }));
    expect(onOpen).toHaveBeenCalledWith(mockSessions[0]);
  });

  it('navigates to all sessions from "Ver todas"', async () => {
    const user = userEvent.setup();
    const { onViewAll } = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Ver todas as sessões' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state without sessions', () => {
    renderPanel({ sessions: [] });
    expect(screen.getByText('Sem sessões no período.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver todas as sessões' })).not.toBeInTheDocument();
  });

  it('hides the empty state while loading', () => {
    renderPanel({ sessions: [], loading: true });
    expect(screen.getByRole('heading', { name: 'Sessões recentes' })).toBeInTheDocument();
    expect(screen.queryByText('Sem sessões no período.')).not.toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderPanel({ sessions: [], error: new Error('fail') });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar sessões');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
