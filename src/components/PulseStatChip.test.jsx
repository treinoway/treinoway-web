import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import PulseStatChip from './PulseStatChip';

describe('PulseStatChip', () => {
  it('renders label and value', () => {
    renderWithRoute(<PulseStatChip label="Streak" value="12d" />);
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('12d')).toBeInTheDocument();
  });

  it('renders em-dash when value is null', () => {
    renderWithRoute(<PulseStatChip label="Streak" value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders em-dash when value is undefined', () => {
    renderWithRoute(<PulseStatChip label="Streak" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('applies isEmpty modifier class when isEmpty is true', () => {
    const { container } = renderWithRoute(<PulseStatChip label="Streak" value="—" isEmpty />);
    expect(container.querySelector('.pulse-stat-value--empty')).toBeInTheDocument();
  });

  it('does not apply isEmpty modifier when isEmpty is false', () => {
    const { container } = renderWithRoute(<PulseStatChip label="Streak" value="12d" isEmpty={false} />);
    expect(container.querySelector('.pulse-stat-value--empty')).not.toBeInTheDocument();
  });

  it('renders numeric value as string', () => {
    renderWithRoute(<PulseStatChip label="Sessões" value={8} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
