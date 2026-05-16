import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import RevenueWaveform from './RevenueWaveform';

const makeBars = (overrides = []) =>
  Array.from({ length: 30 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    status: 'empty',
    pct: 0,
    isToday: false,
    ...overrides[i],
  }));

describe('RevenueWaveform', () => {
  it('renders the aria group label', () => {
    render(<RevenueWaveform bars={[]} />);
    expect(
      screen.getByRole('group', { name: 'Receita dos últimos 30 dias' }),
    ).toBeInTheDocument();
  });

  it('renders 30 ghost bars when no data is provided', () => {
    const { container } = render(<RevenueWaveform bars={[]} />);
    const bars = container.querySelectorAll('.pulse-bar');
    expect(bars).toHaveLength(30);
  });

  it('renders 30 bars when full data is provided', () => {
    const { container } = render(<RevenueWaveform bars={makeBars()} />);
    const bars = container.querySelectorAll('.pulse-bar');
    expect(bars).toHaveLength(30);
  });

  it('applies today marker class to the bar marked isToday', () => {
    const bars = makeBars([{}, {}, { isToday: true, status: 'success', pct: 60 }]);
    const { container } = render(<RevenueWaveform bars={bars} />);
    const todayBars = container.querySelectorAll('.pulse-bar--today');
    expect(todayBars).toHaveLength(1);
  });

  it('applies correct fill modifier class for each status', () => {
    const bars = [
      { date: '2026-05-01', status: 'success', pct: 80, isToday: false },
      { date: '2026-05-02', status: 'partial', pct: 50, isToday: false },
      { date: '2026-05-03', status: 'danger', pct: 30, isToday: false },
      { date: '2026-05-04', status: 'empty', pct: 0, isToday: false },
    ];
    const { container } = render(<RevenueWaveform bars={bars} />);
    expect(container.querySelector('.pulse-bar-fill--success')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--partial')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--danger')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--empty')).toBeInTheDocument();
  });

  it('renders the legend key with three items', () => {
    render(<RevenueWaveform bars={[]} />);
    expect(screen.getByText('Recebido')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });

  it('renders axis dates from first and last bars', () => {
    const bars = makeBars();
    render(<RevenueWaveform bars={bars} />);
    expect(screen.getByText('1 mai')).toBeInTheDocument();
    expect(screen.getByText('30 mai')).toBeInTheDocument();
  });
});
