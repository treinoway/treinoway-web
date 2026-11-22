import { useRef } from 'react';
import PropTypes from 'prop-types';

const NAV_KEYS = { ArrowRight: 1, ArrowLeft: -1 };

// Index of the tab a navigation key lands on, wrapping around the ends; null for other keys.
const targetIndex = (key, current, total) => {
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  if (!(key in NAV_KEYS)) return null;
  return (current + NAV_KEYS[key] + total) % total;
};

// Underline tabs of the design system, with optional counts and arrow-key navigation.
const Tabs = ({ ariaLabel, tabs, value, onChange }) => {
  const refs = useRef([]);

  const handleKeyDown = (event, index) => {
    const next = targetIndex(event.key, index, tabs.length);
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  return (
    <div className="ds-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`ds-tabs__item${active ? ' ds-tabs__item--active' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
            {tab.count != null && (
              <>
                {' '}
                <span className="ds-tabs__count">{tab.count}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

Tabs.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    count: PropTypes.number,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Tabs;
