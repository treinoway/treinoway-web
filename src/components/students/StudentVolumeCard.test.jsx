import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import StudentVolumeCard from './StudentVolumeCard';

const days = [
  { date: '2026-09-02', session: null },
  {
    date: '2026-09-03',
    session: {
      status: 'completed',
      volumeKg: 2540,
      hasLoad: true,
      pct: 100,
      sessionCount: 1,
      trainingName: null,
      completedSets: 6,
      totalSets: 6,
    },
  },
];

const renderCard = (props = {}) => {
  const onRetry = vi.fn();
  render(
    <StudentVolumeCard
      vizData={{ type: 'waveform', days }}
      periodLabel="Últimos 30 dias"
      loading={false}
      error={null}
      onRetry={onRetry}
      {...props}
    />,
  );
  return onRetry;
};

describe('StudentVolumeCard', () => {
  it('titles the card with the selected period', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: /volume por sessão\s*·\s*últimos 30 dias/i })).toBeInTheDocument();
  });

  it('renders the volume chart', () => {
    renderCard();
    expect(screen.getByRole('group', { name: 'Volume por sessão' })).toBeInTheDocument();
  });

  it('shows an empty state without sessions in the period', () => {
    renderCard({ vizData: { type: 'waveform', days: [] } });
    expect(screen.getByText('Sem sessões no período.')).toBeInTheDocument();
  });

  it('shows the empty state when the period only has rest days', () => {
    renderCard({ vizData: { type: 'waveform', days: [{ date: '2026-09-02', session: null }] } });
    expect(screen.getByText('Sem sessões no período.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('hides the chart and the empty state while loading', () => {
    renderCard({ vizData: { type: 'waveform', days: [] }, loading: true });
    expect(screen.queryByText('Sem sessões no período.')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    const onRetry = renderCard({ error: new Error('fail') });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar atividade');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('switches to the day heatmap for long periods', () => {
    const weeks = [{ label: 'set', days: [{ date: '2026-09-01', status: 'completed', volumeKg: 100, isToday: false, isFirstRow: true, inPeriod: true }] }];
    renderCard({ vizData: { type: 'heatmap', weeks, maxVolumeKg: 100 } });
    expect(screen.getByRole('heading', { name: /atividade por dia/i })).toBeInTheDocument();
  });
});
