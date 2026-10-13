import PropTypes from 'prop-types';

/**
 * Loading placeholder for a list: `count` stacked `.row-skeleton` bars, announced once
 * as a status with `label` (e.g. "Carregando rotinas"). Pick `count` to match the
 * typical loaded list so the card keeps its height when the data lands.
 */
const SkeletonRows = ({ label, count = 3 }) => (
  <div className="skeleton-rows" role="status" aria-label={label}>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="row-skeleton" aria-hidden="true" />
    ))}
  </div>
);

SkeletonRows.propTypes = {
  label: PropTypes.string.isRequired,
  count: PropTypes.number,
};

export default SkeletonRows;
