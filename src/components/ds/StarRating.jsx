import PropTypes from 'prop-types';
import { Star } from 'lucide-react';

/** Read-only row of `max` stars (`.star-rating`), announced through its label instead of the icons. Presentation only. */
const StarRating = ({ max = 5, label }) => (
  <div className="star-rating" role="img" aria-label={label ?? `${max} estrelas`}>
    {Array.from({ length: max }, (_, index) => (
      <Star key={index} size={24} strokeWidth={2} aria-hidden="true" />
    ))}
  </div>
);

StarRating.propTypes = {
  max: PropTypes.number,
  label: PropTypes.string,
};

export default StarRating;
