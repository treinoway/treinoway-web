import { render, screen } from '../../test/test-utils';
import TierBadge from './TierBadge';

describe('TierBadge', () => {
  it('renders the FREE label with neutral tone', () => {
    render(<TierBadge tier="FREE" />);
    expect(screen.getByText('Grátis')).toHaveClass('badge--neutral');
  });

  it.each([['PRO', 'Pro'], ['PLATINUM', 'Platinum'], ['DIAMOND', 'Diamond']])('renders %s with brand tone', (tier, label) => {
    render(<TierBadge tier={tier} />);
    expect(screen.getByText(label)).toHaveClass('badge--brand');
  });
});
