import { render, screen } from '../../test/test-utils';
import TierBadge from './TierBadge';

describe('TierBadge - BETA and unknown tiers', () => {
  it('renders the BETA label with brand tone', () => {
    render(<TierBadge tier="BETA" />);

    expect(screen.getByText('Beta')).toHaveClass('badge--brand');
  });

  it('falls back to the raw tier string for an unknown tier, never empty', () => {
    render(<TierBadge tier="GOLD" />);

    expect(screen.getByText('GOLD')).toBeInTheDocument();
  });
});
