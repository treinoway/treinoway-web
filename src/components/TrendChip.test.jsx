import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import TrendChip from './TrendChip';

describe('TrendChip', () => {
  it('renders flat dash when deltaPct is null', () => {
    render(<TrendChip deltaPct={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByLabelText('Sem comparativo')).toBeInTheDocument();
  });

  it('renders flat dash when deltaPct is undefined', () => {
    render(<TrendChip />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats positive deltas with + prefix', () => {
    render(<TrendChip deltaPct={10.34} />);
    expect(screen.getByText('+10.34%')).toBeInTheDocument();
  });

  it('formats negative deltas without + prefix', () => {
    render(<TrendChip deltaPct={-5.5} />);
    expect(screen.getByText('-5.5%')).toBeInTheDocument();
  });

  it('renders neutral chip when delta is zero', () => {
    const { container } = render(<TrendChip deltaPct={0} />);
    expect(container.querySelector('.trend-chip--neutral')).toBeInTheDocument();
  });

  it('uses up styling for positive deltas', () => {
    const { container } = render(<TrendChip deltaPct={5} />);
    expect(container.querySelector('.trend-chip--up')).toBeInTheDocument();
  });

  it('uses down styling for negative deltas', () => {
    const { container } = render(<TrendChip deltaPct={-5} />);
    expect(container.querySelector('.trend-chip--down')).toBeInTheDocument();
  });

  it('uses ariaLabel override when provided', () => {
    render(<TrendChip deltaPct={3} ariaLabel="Variação 3%" />);
    expect(screen.getByLabelText('Variação 3%')).toBeInTheDocument();
  });
});
