import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import PulseHeatmap from './PulseHeatmap';

const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const makeWeek = (startDate, overrides = []) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate + 'T00:00:00');
    date.setDate(date.getDate() + i);
    const d = date.toISOString().slice(0, 10);
    return {
      date: d,
      status: 'empty',
      volumeKg: null,
      isToday: false,
      isFirstRow: false,
      inPeriod: true,
      ...overrides[i],
    };
  });
  return { label: 'abr', days };
};

describe('PulseHeatmap', () => {
  it('renders day-of-week labels', () => {
    const weeks = [makeWeek('2026-04-27')];
    renderWithRoute(<PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />);
    DOW.forEach((d) => {
      expect(screen.getAllByText(d).length).toBeGreaterThan(0);
    });
  });

  it('renders a grid cell for each day', () => {
    const weeks = [makeWeek('2026-04-27')];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(7);
  });

  it('applies today modifier on the today cell', () => {
    const weeks = [makeWeek('2026-04-27', [
      {}, {}, {}, // Mon Tue Wed
      { isToday: true, inPeriod: true, status: 'completed', volumeKg: 800 }, // Thu = today
      {}, {}, {},
    ])];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--today')).toBeInTheDocument();
  });

  it('applies first-row modifier when today is on first row', () => {
    const weeks = [makeWeek('2026-04-27', [
      { isToday: true, isFirstRow: true, inPeriod: true, status: 'completed', volumeKg: 800 },
      {}, {}, {}, {}, {}, {},
    ])];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--today--first-row')).toBeInTheDocument();
  });

  it('does NOT apply first-row modifier when today is not on first row', () => {
    const week1 = makeWeek('2026-04-20'); // first row, no today
    const week2 = makeWeek('2026-04-27', [
      {}, {}, {},
      { isToday: true, isFirstRow: false, inPeriod: true, status: 'completed', volumeKg: 800 },
      {}, {}, {},
    ]);
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={[week1, week2]} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--today')).toBeInTheDocument();
    expect(container.querySelector('.pulse-heatmap-cell--today--first-row')).not.toBeInTheDocument();
  });

  it('applies intensity class s4 for full-volume completed cell', () => {
    const weeks = [makeWeek('2026-04-27', [
      { inPeriod: true, status: 'completed', volumeKg: 1000 }, // 100% = s4
      {}, {}, {}, {}, {}, {},
    ])];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--s4')).toBeInTheDocument();
  });

  it('applies partial class for partial status cell', () => {
    const weeks = [makeWeek('2026-04-27', [
      { inPeriod: true, status: 'partial', volumeKg: 500 },
      {}, {}, {}, {}, {}, {},
    ])];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--partial')).toBeInTheDocument();
  });

  it('applies abandoned class for abandoned status cell', () => {
    const weeks = [makeWeek('2026-04-27', [
      { inPeriod: true, status: 'abandoned', volumeKg: 200 },
      {}, {}, {}, {}, {}, {},
    ])];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    expect(container.querySelector('.pulse-heatmap-cell--abandoned')).toBeInTheDocument();
  });

  it('renders the legend with Menos and Mais labels', () => {
    const weeks = [makeWeek('2026-04-27')];
    renderWithRoute(<PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />);
    expect(screen.getByText('Menos')).toBeInTheDocument();
    expect(screen.getByText('Mais')).toBeInTheDocument();
  });

  it('renders multiple weeks as multiple rows', () => {
    const weeks = [makeWeek('2026-04-20'), makeWeek('2026-04-27')];
    const { container } = renderWithRoute(
      <PulseHeatmap weeks={weeks} dowLabels={DOW} maxVolumeKg={1000} />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(14);
  });
});
