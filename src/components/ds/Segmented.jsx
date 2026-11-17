import PropTypes from 'prop-types';

const Segmented = ({ ariaLabel, items, value, onChange, disabled = false, wrap = false }) => (
  <div className={`segmented${wrap ? ' segmented--wrap' : ''}`} role="tablist" aria-label={ariaLabel}>
    {items.map((item) => {
      const active = value === item.id;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={item.domId}
          aria-controls={item.controls}
          aria-selected={active}
          disabled={disabled}
          className={`segmented-item${active ? ' segmented-item--active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon && <item.icon size={16} strokeWidth={2} aria-hidden="true" />}
          {item.label}
          {item.count != null && (
            <>
              {' '}
              <span className="segmented-item-count">({item.count})</span>
            </>
          )}
        </button>
      );
    })}
  </div>
);

Segmented.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
      icon: PropTypes.elementType,
      domId: PropTypes.string,
      controls: PropTypes.string,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  wrap: PropTypes.bool,
};

export default Segmented;
