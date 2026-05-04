import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import PulseWaveform from './PulseWaveform';

const makeBar = (overrides = {}) => ({
  date: '2026-04-30',
  status: 'completed',
  volumeKg: 1200,
  pct: 80,
  trainingName: 'Treino A',
  completedSets: 4,
  totalSets: 4,
  isToday: false,
  ...overrides,
});

const makeBars = (count = 30) =>
  Array.from({ length: count }, (_, i) => makeBar({
    date: `2026-04-${String(i + 1).padStart(2, '0')}`,
    isToday: i === 29,
  }));

describe('PulseWaveform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 30 ghost bars when bars prop is empty', () => {
    const { container } = renderWithRoute(<PulseWaveform bars={[]} />);
    const bars = container.querySelectorAll('.pulse-bar');
    expect(bars).toHaveLength(30);
  });

  it('renders the provided bars', () => {
    const { container } = renderWithRoute(<PulseWaveform bars={makeBars(30)} />);
    const bars = container.querySelectorAll('.pulse-bar');
    expect(bars).toHaveLength(30);
  });

  it('marks the today bar with pulse-bar--today class', () => {
    const bars = makeBars(30);
    // Make only bar at index 15 "today"; clear the factory-set today at index 29
    bars[15] = { ...bars[15], isToday: true };
    bars[29] = { ...bars[29], isToday: false };
    const { container } = renderWithRoute(<PulseWaveform bars={bars} />);
    const todayBars = container.querySelectorAll('.pulse-bar--today');
    expect(todayBars).toHaveLength(1);
  });

  it('renders waveform legend', () => {
    renderWithRoute(<PulseWaveform bars={makeBars(30)} />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('Abandonado')).toBeInTheDocument();
  });

  it('applies correct fill modifier for each status', () => {
    const bars = [
      makeBar({ date: '2026-04-01', status: 'completed', pct: 80 }),
      makeBar({ date: '2026-04-02', status: 'partial', pct: 50 }),
      makeBar({ date: '2026-04-03', status: 'abandoned', pct: 30 }),
      makeBar({ date: '2026-04-04', status: 'empty', pct: 0 }),
    ];
    const { container } = renderWithRoute(<PulseWaveform bars={bars} />);
    expect(container.querySelector('.pulse-bar-fill--success')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--partial')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--danger')).toBeInTheDocument();
    expect(container.querySelector('.pulse-bar-fill--empty')).toBeInTheDocument();
  });

  it('shows tooltip on hover for a non-empty bar', async () => {
    const user = userEvent.setup();
    const bars = [makeBar({ date: '2026-04-30', status: 'completed', pct: 80 })];
    renderWithRoute(<PulseWaveform bars={bars} />);

    const bar = screen.getByRole('button', { name: /2026-04-30/i });
    await user.hover(bar);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip after mouse leave', async () => {
    const user = userEvent.setup();
    const bars = [makeBar({ date: '2026-04-30', status: 'completed', pct: 80 })];
    renderWithRoute(<PulseWaveform bars={bars} />);

    const bar = screen.getByRole('button', { name: /2026-04-30/i });
    await user.hover(bar);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.unhover(bar);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens tooltip on Enter key', async () => {
    const user = userEvent.setup();
    const bars = [makeBar({ date: '2026-04-30', status: 'completed', pct: 80 })];
    renderWithRoute(<PulseWaveform bars={bars} />);

    // Tab to focus the bar (fires React onFocus → tooltip opens)
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    // Press Enter while tooltip is open — tooltip stays open
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes tooltip on Escape key', async () => {
    const user = userEvent.setup();
    const bars = [makeBar({ date: '2026-04-30', status: 'completed', pct: 80 })];
    renderWithRoute(<PulseWaveform bars={bars} />);

    // Tab to focus the bar (fires React onFocus → tooltip opens)
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('uses left-anchored tooltip for bar at index 0', async () => {
    const user = userEvent.setup();
    // 4 bars; index 0 should get left anchor
    const bars = Array.from({ length: 4 }, (_, i) =>
      makeBar({ date: `2026-04-0${i + 1}`, pct: 50 }),
    );
    renderWithRoute(<PulseWaveform bars={bars} />);

    const allBars = screen.getAllByRole('button');
    await user.hover(allBars[0]);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('uses right-anchored tooltip for bar at index 29', async () => {
    const user = userEvent.setup();
    const bars = makeBars(30);
    renderWithRoute(<PulseWaveform bars={bars} />);

    const allBars = screen.getAllByRole('button');
    await user.hover(allBars[29]);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
  });

  it('does not render tooltip for empty bars', () => {
    const bars = [makeBar({ date: '2026-04-01', status: 'empty', pct: 0 })];
    renderWithRoute(<PulseWaveform bars={bars} />);
    // Empty bars should not be focusable buttons
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
