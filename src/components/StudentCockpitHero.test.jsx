import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import StudentCockpitHero from './StudentCockpitHero';

vi.mock('./PulseWaveform', () => ({ default: () => <div data-testid="pulse-waveform" /> }));
vi.mock('./PulseHeatmap', () => ({ default: () => <div data-testid="pulse-heatmap" /> }));
vi.mock('./SubscriptionStrip', () => ({ default: () => <div data-testid="subscription-strip" /> }));

const mockStudent = {
  id: 'student-1',
  firstName: 'Neto',
  lastName: 'Santos',
  email: 'neto@aluno.com',
  createdAt: '2026-02-15T00:00:00Z',
};

const mockSummary = {
  completionRate: 0.85,
  daysSinceLast: 2,
  sessionsPerWeek: 3.5,
  maxStreak: 12,
  currentProtocol: { name: 'Hipertrofia', weekNumber: 3, totalWeeks: 8 },
};

const mockPreviousSummary = { completionRate: 0.80 };

const defaultProps = {
  student: mockStudent,
  summary: mockSummary,
  previousSummary: mockPreviousSummary,
  summaryLoading: false,
  period: {},
  periodLabel: 'Últimos 30 dias',
  vizData: { type: 'waveform', bars: [] },
  onPeriodClick: vi.fn(),
  onCreateProtocol: vi.fn(),
  onLinkAnamnesis: vi.fn(),
};

describe('StudentCockpitHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student name', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Neto Santos')).toBeInTheDocument();
  });

  it('renders student email', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('neto@aluno.com')).toBeInTheDocument();
  });

  it('renders avatar initial', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('renders joined month/year', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText(/fev\/2026/i)).toBeInTheDocument();
  });

  it('renders subscription strip', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByTestId('subscription-strip')).toBeInTheDocument();
  });

  it('renders active protocol eyebrow', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Hipertrofia')).toBeInTheDocument();
    expect(screen.getByText('Semana 3/8')).toBeInTheDocument();
  });

  it('renders Aderência KPI label', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Aderência')).toBeInTheDocument();
  });

  it('renders Últ. sessão KPI label', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Últ. sessão')).toBeInTheDocument();
  });

  it('renders Sessões KPI label', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Sessões')).toBeInTheDocument();
  });

  it('renders Streak KPI label', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Streak')).toBeInTheDocument();
  });

  it('renders period picker button with current period label', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
  });

  it('calls onPeriodClick when period button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /alterar período/i }));
    expect(defaultProps.onPeriodClick).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateProtocol when Nova rotina is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /nova rotina/i }));
    expect(defaultProps.onCreateProtocol).toHaveBeenCalledTimes(1);
  });

  it('calls onLinkAnamnesis when Vincular anamnese is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /vincular anamnese/i }));
    expect(defaultProps.onLinkAnamnesis).toHaveBeenCalledTimes(1);
  });

  it('renders placeholders when loading without summary', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summaryLoading
        summary={null}
        previousSummary={null}
      />,
    );
    expect(screen.getByText('Neto Santos')).toBeInTheDocument();
    expect(screen.getByText('Aderência')).toBeInTheDocument();
  });

  it('renders waveform viz', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByTestId('pulse-waveform')).toBeInTheDocument();
  });

  it('renders heatmap viz when vizData type is heatmap', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        vizData={{ type: 'heatmap', weeks: [], dowLabels: [], maxVolumeKg: 0 }}
      />,
    );
    expect(screen.getByTestId('pulse-heatmap')).toBeInTheDocument();
  });

  it('shows "Nenhuma rotina ativa" when no protocol', () => {
    const noProtocolSummary = { ...mockSummary, currentProtocol: null };
    renderWithRouter(
      <StudentCockpitHero {...defaultProps} summary={noProtocolSummary} />,
    );
    expect(screen.getByText('Nenhuma rotina ativa')).toBeInTheDocument();
  });

  it('shows delta trend when previous summary available', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });
});
