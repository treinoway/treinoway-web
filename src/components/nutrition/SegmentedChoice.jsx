import PropTypes from 'prop-types';

// Compact outlined segmented control of the plan summary (view toggle and "equivaler por").
const SegmentedChoice = ({ ariaLabel, items, value, onChange }) => (
  <div className="nutri-seg" role="tablist" aria-label={ariaLabel}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={value === item.id}
        className={`nutri-seg__item${value === item.id ? ' nutri-seg__item--active' : ''}`}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

SegmentedChoice.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, label: PropTypes.string.isRequired })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SegmentedChoice;
