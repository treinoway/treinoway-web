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
  adherence: 62,
  adherenceCompleted: 5,
  adherenceExpected: 8,
  adherenceMonth: '2026-05-01',
  previousAdherence: 50,
  previousAdherenceMonth: '2026-04-01',
  completionRate: 0.95,
  daysSinceLast: 2,
  sessionsPerWeek: 3.5,
  maxStreak: 12,
  currentProtocol: { name: 'Hipertrofia', weekNumber: 3, totalWeeks: 8 },
};

const mockPreviousSummary = { adherence: 57, completionRate: 0.90 };

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

  it('shows plain-language positive delta in points vs previous month name', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    // 62 - 50 = 12 points, previousAdherenceMonth 2026-04-01 → "abril"
    expect(screen.getByText('↑ 12 pontos vs abril')).toBeInTheDocument();
  });

  it('shows plain-language negative delta in points vs previous month', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summary={{ ...mockSummary, adherence: 42, previousAdherence: 50 }}
      />,
    );
    expect(screen.getByText('↓ 8 pontos vs abril')).toBeInTheDocument();
  });

  it('shows "Sem mudança" when delta is zero', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summary={{ ...mockSummary, adherence: 50, previousAdherence: 50 }}
      />,
    );
    expect(screen.getByText('Sem mudança vs abril')).toBeInTheDocument();
  });

  it('omits delta trend when previousAdherence is null', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summary={{ ...mockSummary, previousAdherence: null }}
      />,
    );
    expect(screen.queryByText(/pontos vs/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sem mudança vs/)).not.toBeInTheDocument();
  });

  it('renders the X de Y treinos sub-line under the adherence value', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('5 de 8 treinos')).toBeInTheDocument();
  });

  it('renders the current-month eyebrow above the adherence value', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(screen.getByText('Maio · mês atual')).toBeInTheDocument();
  });

  it('renders empty-state sub-line "Sem rotina ativa" when adherence is null', () => {
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summary={{ ...mockSummary, adherence: null, adherenceCompleted: null, adherenceExpected: null }}
      />,
    );
    expect(screen.getByText('Sem rotina ativa')).toBeInTheDocument();
    // No "X · mês atual" eyebrow when there is no rotina
    expect(screen.queryByText(/mês atual/)).not.toBeInTheDocument();
  });

  it('renders Aderência value from summary.adherence (0–100), not completionRate', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    // adherence is 62 → "62%". completionRate is 0.95 → would render "95%" if mislabeled.
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.queryByText('95%')).not.toBeInTheDocument();
  });

  it('renders an info trigger button next to Aderência', () => {
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /sobre aderência/i }),
    ).toBeInTheDocument();
  });

  it('opens the info popover with completion rate when info button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /sobre aderência/i }));

    const dialog = screen.getByRole('dialog', { name: /aderência/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/taxa de conclus/i);
    // completionRate 0.95 → 95% appears inside the popover
    expect(dialog).toHaveTextContent('95%');
    // Body copy clarifies the metric is locked to the current month
    expect(dialog).toHaveTextContent(/mês corrente, independente do filtro/i);
    expect(dialog).not.toHaveTextContent(/weekDay/i);
  });

  it('hides the completion-rate row in the popover when completionRate is null', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <StudentCockpitHero
        {...defaultProps}
        summary={{ ...mockSummary, completionRate: null }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /sobre aderência/i }));

    const dialog = screen.getByRole('dialog', { name: /aderência/i });
    expect(dialog).not.toHaveTextContent(/taxa de conclus/i);
  });

  it('closes the info popover when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderWithRouter(<StudentCockpitHero {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /sobre aderência/i }));
    expect(screen.getByRole('dialog', { name: /aderência/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /aderência/i })).not.toBeInTheDocument();
  });
});
