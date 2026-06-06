import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import IntensityBadge from './IntensityBadge';

describe('IntensityBadge', () => {
  it('renders the API label when provided', () => {
    render(<IntensityBadge intensity="moderate" label="Moderada" />);
    expect(screen.getByText('Moderada')).toBeInTheDocument();
  });

  it('falls back to the pt-BR label when the API label is missing', () => {
    render(<IntensityBadge intensity="vigorous" />);
    expect(screen.getByText('Vigorosa')).toBeInTheDocument();
  });

  it('renders nothing when there is no intensity', () => {
    const { container } = render(<IntensityBadge intensity={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown intensity key', () => {
    const { container } = render(<IntensityBadge intensity="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies the correct effort tier via data-tier', () => {
    render(<IntensityBadge intensity="near_maximal" label="Quase máxima" />);
    expect(screen.getByText('Quase máxima').closest('span')).toHaveAttribute(
      'data-tier',
      '5'
    );
  });
});
