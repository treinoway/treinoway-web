import { render, screen } from '../../test/test-utils';
import StarRating from './StarRating';

const DS = { StarRating: 'star-rating' };

describe('StarRating', () => {
  it('renders five stars by default under a name that says so', () => {
    render(<StarRating />);

    const rating = screen.getByLabelText(/5 estrelas/i);
    expect(rating).toHaveClass(DS.StarRating);
    expect(rating.querySelectorAll('svg')).toHaveLength(5);
  });

  it('renders as many stars as max', () => {
    render(<StarRating max={3} />);

    const rating = screen.getByLabelText(/3 estrelas/i);
    expect(rating).toHaveClass(DS.StarRating);
    expect(rating.querySelectorAll('svg')).toHaveLength(3);
    expect(screen.queryByLabelText(/5 estrelas/i)).not.toBeInTheDocument();
  });

  it('hides the star icons from assistive technology, which reads the name instead', () => {
    render(<StarRating />);

    screen.getByLabelText(/5 estrelas/i).querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});
