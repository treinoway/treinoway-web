import { render, screen } from '../../test/test-utils';
import WeekHistoryChart from './WeekHistoryChart';

const WEEKS = [
  { weekStart: '2026-10-19', number: 1, state: 'closed', status: 'valid', score: 64 },
  { weekStart: '2026-10-26', number: 2, state: 'closed', status: 'valid', score: 58 },
  { weekStart: '2026-11-02', number: 3, state: 'current', status: 'valid', score: 21 },
  { weekStart: '2026-11-09', number: 4, state: 'future', status: null, score: null },
];

describe('WeekHistoryChart', () => {
  it('PAN-21 draws closed, current and future weeks', () => {
    render(<WeekHistoryChart weeks={WEEKS} riskLimit={70} seasonNumber={3} closeLabel="domingo às 21h" />);

    expect(screen.getByText('Semana a semana · Temporada 3')).toBeInTheDocument();
    expect(screen.getByText('linha = limite de risco 70%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Semana 1: 64%' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Semana 2: 58%' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Semana 3 em andamento: 21%' })).toHaveClass('week-chart__bar--current');
    expect(screen.getByRole('img', { name: 'Semana 4: sem pontuação' })).toHaveClass('week-chart__bar--empty');
    ['Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('21%')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Semana 3 em andamento (listrada): 21% até agora, fecha domingo às 21h.')).toBeInTheDocument();
  });

  it('CAMP-53 titles the chart without a season when opened from a championship', () => {
    render(<WeekHistoryChart weeks={WEEKS} riskLimit={70} />);

    expect(screen.getByRole('heading', { name: 'Semana a semana' })).toBeInTheDocument();
    expect(screen.queryByText(/Temporada/)).not.toBeInTheDocument();
  });

  it('PAN-21 paints closed weeks below the risk limit with the warning color and the others with the chart color', () => {
    const weeks = [
      { weekStart: '2026-10-19', number: 1, state: 'closed', status: 'valid', score: 64 },
      { weekStart: '2026-10-26', number: 2, state: 'closed', status: 'valid', score: 70 },
      { weekStart: '2026-11-02', number: 3, state: 'closed', status: 'valid', score: 100 },
    ];
    render(<WeekHistoryChart weeks={weeks} riskLimit={70} seasonNumber={3} />);

    expect(screen.getByRole('img', { name: 'Semana 1: 64%' })).toHaveClass('week-chart__bar--warning');
    expect(screen.getByRole('img', { name: 'Semana 2: 70%' })).not.toHaveClass('week-chart__bar--warning');
    expect(screen.getByRole('img', { name: 'Semana 3: 100%' })).not.toHaveClass('week-chart__bar--warning');
  });

  it('PAN-21 draws the dashed limit line at the risk limit in every week column', () => {
    const { container } = render(<WeekHistoryChart weeks={WEEKS} riskLimit={70} seasonNumber={3} />);

    const lines = container.querySelectorAll('.week-chart__limit');
    expect(lines).toHaveLength(WEEKS.length);
    lines.forEach((line) => expect(line.style.bottom).toBe('70%'));
  });

  it('PAN-21 shows the limit configured for the trainer in the legend', () => {
    render(<WeekHistoryChart weeks={WEEKS} riskLimit={80} seasonNumber={3} />);
    expect(screen.getByText('linha = limite de risco 80%')).toBeInTheDocument();
  });

  it('PAN-21 shows a dash for a closed week without a score and keeps the whole-percent format', () => {
    const weeks = [
      { weekStart: '2026-10-19', number: 1, state: 'closed', status: 'paused', score: null },
      { weekStart: '2026-10-26', number: 2, state: 'closed', status: 'valid', score: 99.6 },
    ];
    render(<WeekHistoryChart weeks={weeks} riskLimit={70} seasonNumber={3} />);

    expect(screen.getByRole('img', { name: 'Semana 1: sem pontuação' })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('99%')).toBeInTheDocument();
  });

  it('PAN-21 omits the closing time from the running-week note when it is not known', () => {
    render(<WeekHistoryChart weeks={WEEKS} riskLimit={70} seasonNumber={3} />);
    expect(screen.getByText('Semana 3 em andamento (listrada): 21% até agora.')).toBeInTheDocument();
  });

  it('shows no running-week note when the season has no running week', () => {
    render(<WeekHistoryChart weeks={WEEKS.filter((week) => week.state === 'closed')} riskLimit={70} seasonNumber={3} />);
    expect(screen.queryByText(/em andamento \(listrada\)/)).not.toBeInTheDocument();
  });
});
