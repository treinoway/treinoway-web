import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import RecentSessionsPanel from './RecentSessionsPanel';

vi.mock('./SessionInstrumentRow', () => ({
  default: ({ sessionName, rpeText }) => (
    <div data-testid="session-row" data-rpe={rpeText ?? ''}>
      {sessionName}
    </div>
  ),
}));

const mockSessions = [
  {
    id: 'sess-1',
    status: 'completed',
    startedAt: '2026-05-13T10:00:00Z',
    trainingName: 'Treino A',
    completedSets: 24,
    skippedSets: 0,
    averageRpe: 7.5,
    trainerNote: null,
  },
  {
    id: 'sess-2',
    status: 'partial',
    startedAt: '2026-05-11T10:00:00Z',
    trainingName: 'Treino B',
    completedSets: 18,
    skippedSets: 6,
    averageRpe: null,
    trainerNote: 'Bom esforço',
  },
];

const defaultProps = {
  sessions: mockSessions,
  loading: false,
  error: null,
  onViewAll: vi.fn(),
  onRetry: vi.fn(),
};

describe('RecentSessionsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders section heading', () => {
    renderWithRouter(<RecentSessionsPanel {...defaultProps} />);
    expect(screen.getByText('Sessões recentes')).toBeInTheDocument();
  });

  it('renders one row per session', () => {
    renderWithRouter(<RecentSessionsPanel {...defaultProps} />);
    expect(screen.getAllByTestId('session-row')).toHaveLength(2);
  });

  it('renders session names', () => {
    renderWithRouter(<RecentSessionsPanel {...defaultProps} />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
    expect(screen.getByText('Treino B')).toBeInTheDocument();
  });

  it('passes bare RPE value (no "RPE " prefix) to SessionInstrumentRow', () => {
    renderWithRouter(<RecentSessionsPanel {...defaultProps} />);
    const rows = screen.getAllByTestId('session-row');
    // sess-1 has averageRpe 7.5 → should receive "7,5" not "RPE 7,5"
    expect(rows[0]).toHaveAttribute('data-rpe', '7,5');
    // sess-2 has averageRpe null → should receive empty string (null rendered as '')
    expect(rows[1]).toHaveAttribute('data-rpe', '');
  });

  it('calls onViewAll when "Ver todas" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RecentSessionsPanel {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /ver todas as sessões/i }));
    expect(defaultProps.onViewAll).toHaveBeenCalledTimes(1);
  });

  it('returns null when sessions is empty and not loading', () => {
    const { container } = renderWithRouter(
      <RecentSessionsPanel {...defaultProps} sessions={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders skeleton when loading with no sessions', () => {
    renderWithRouter(
      <RecentSessionsPanel {...defaultProps} sessions={[]} loading />,
    );
    expect(document.querySelector('.activity-section-skeleton')).toBeInTheDocument();
  });

  it('renders error state and retry button when error with no sessions', () => {
    renderWithRouter(
      <RecentSessionsPanel
        {...defaultProps}
        sessions={[]}
        error={new Error('fail')}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <RecentSessionsPanel
        {...defaultProps}
        sessions={[]}
        error={new Error('fail')}
      />,
    );
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });
});
