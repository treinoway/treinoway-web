import PropTypes from 'prop-types';

const SOURCES = {
  taco: { label: 'TACO', modifier: 'taco' },
  tbca: { label: 'TBCA', modifier: 'tbca' },
  custom: { label: 'Meus alimentos', modifier: 'custom' },
};

/** Small tag with the composition source of a food: TACO, TBCA or Meus alimentos. */
const FoodSourceBadge = ({ source }) => {
  const known = SOURCES[source];
  return <span className={`food-source food-source--${known?.modifier ?? 'taco'}`}>{known?.label ?? source}</span>;
};

FoodSourceBadge.propTypes = { source: PropTypes.string.isRequired };

export default FoodSourceBadge;
