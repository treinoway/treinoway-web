import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import StatDisplay from './StatDisplay';

describe('StatDisplay', () => {
  it('renders with minimum required props', () => {
    render(<StatDisplay value={127} label="VOLUME TOTAL" />);
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText('VOLUME TOTAL')).toBeInTheDocument();
  });

  it('renders unit when provided', () => {
    render(<StatDisplay value={127} unit="kg" label="CARGA MÁXIMA" />);
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('does not render unit element when unit is omitted', () => {
    render(<StatDisplay value={42} label="SÉRIES" />);
    expect(screen.queryByText('kg')).not.toBeInTheDocument();
  });

  it('renders trend text when provided', () => {
    render(<StatDisplay value={85} label="ADERÊNCIA" trend="+12%" />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('does not render trend element when trend is omitted', () => {
    render(<StatDisplay value={85} label="ADERÊNCIA" />);
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('infers trendDirection "up" from a "+" prefix', () => {
    const { container } = render(
      <StatDisplay value={100} label="VOLUME" trend="+5%" />
    );
    expect(container.querySelector('.stat-display-trend--up')).toBeInTheDocument();
    expect(container.querySelector('.stat-display-trend--down')).not.toBeInTheDocument();
    expect(container.querySelector('.stat-display-trend--neutral')).not.toBeInTheDocument();
  });

  it('infers trendDirection "down" from a "-" prefix', () => {
    const { container } = render(
      <StatDisplay value={80} label="VOLUME" trend="-3%" />
    );
    expect(container.querySelector('.stat-display-trend--down')).toBeInTheDocument();
    expect(container.querySelector('.stat-display-trend--up')).not.toBeInTheDocument();
  });

  it('infers trendDirection "neutral" when trend has no +/- prefix', () => {
    const { container } = render(
      <StatDisplay value={80} label="VOLUME" trend="0%" />
    );
    expect(container.querySelector('.stat-display-trend--neutral')).toBeInTheDocument();
  });

  it('uses explicit trendDirection prop over inferred direction', () => {
    const { container } = render(
      <StatDisplay value={80} label="VOLUME" trend="+5%" trendDirection="down" />
    );
    expect(container.querySelector('.stat-display-trend--down')).toBeInTheDocument();
    expect(container.querySelector('.stat-display-trend--up')).not.toBeInTheDocument();
  });

  it('applies hero variant class', () => {
    const { container } = render(
      <StatDisplay value={56} label="PR" variant="hero" />
    );
    expect(container.querySelector('.stat-display--hero')).toBeInTheDocument();
    expect(container.querySelector('.stat-display')).toBeInTheDocument();
  });

  it('applies inline variant class', () => {
    const { container } = render(
      <StatDisplay value={24} label="SÉRIES" variant="inline" />
    );
    expect(container.querySelector('.stat-display--inline')).toBeInTheDocument();
  });

  it('does not add variant modifier class for default variant', () => {
    const { container } = render(
      <StatDisplay value={32} label="REPS" variant="default" />
    );
    expect(container.querySelector('.stat-display--default')).not.toBeInTheDocument();
    expect(container.querySelector('.stat-display')).toBeInTheDocument();
  });

  it('applies extra className', () => {
    const { container } = render(
      <StatDisplay value={10} label="CICLOS" className="my-extra-class" />
    );
    expect(container.querySelector('.stat-display.my-extra-class')).toBeInTheDocument();
  });
});
