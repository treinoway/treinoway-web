import PropTypes from 'prop-types';

// Underline tabs of the patient page (and of the patients list).
const PatientTabs = ({ ariaLabel, tabs, value, onChange }) => (
  <div className="nutri-tabs" role="tablist" aria-label={ariaLabel}>
    {tabs.map((tab) => {
      const active = tab.id === value;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active}
          className={`nutri-tabs__item${active ? ' nutri-tabs__item--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.count == null ? tab.label : `${tab.label} (${tab.count})`}
        </button>
      );
    })}
  </div>
);

PatientTabs.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    count: PropTypes.number,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default PatientTabs;
