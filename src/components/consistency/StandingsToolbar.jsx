import PropTypes from 'prop-types';
import { AlertTriangle, Pause, Search, Zap } from 'lucide-react';
import Tabs from '../ds/Tabs';
import { STANDINGS_FILTER, STANDINGS_FILTER_OPTIONS, STANDINGS_TAB, STANDINGS_TAB_OPTIONS } from '../../constants/consistencyRanking';

// Tab options in the shape of the underline tabs
const TAB_ITEMS = STANDINGS_TAB_OPTIONS.map((option) => ({ id: option.value, label: option.label }));

const FILTER_ICONS = Object.freeze({
  [STANDINGS_FILTER.RISK]: AlertTriangle,
  [STANDINGS_FILTER.SIGNAL]: Zap,
  [STANDINGS_FILTER.PAUSED]: Pause,
});

// One filter chip with its icon and count
const FilterChip = ({ option, count, active, onSelect }) => {
  const Icon = FILTER_ICONS[option.value];
  return (
    <button type="button" className={`consistency-chip${active ? ' consistency-chip--active' : ''}`} aria-pressed={active} onClick={() => onSelect(option.value)}>
      {Icon && <Icon size={16} strokeWidth={2} aria-hidden="true" />}
      {option.label}
      {' '}
      <span className="consistency-chip__count">{count}</span>
    </button>
  );
};

FilterChip.propTypes = {
  option: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }).isRequired,
  count: PropTypes.number.isRequired,
  active: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// Filter chips with the live-average note, shown on the current-season tab
const StandingsFilters = ({ filter, onFilterChange, counts, live }) => (
  <div className="consistency-toolbar__filters">
    {STANDINGS_FILTER_OPTIONS.map((option) => (
      <FilterChip key={option.value} option={option} count={counts[option.value] ?? 0} active={filter === option.value} onSelect={onFilterChange} />
    ))}
    {live && <p className="consistency-toolbar__note type-caption">Média ao vivo: durante a semana a média só sobe. Valor real entra no fechamento.</p>}
  </div>
);

StandingsFilters.propTypes = {
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
  live: PropTypes.bool.isRequired,
};

// Tabs of the ranking page, plus search and filter chips on the current season tab
const StandingsToolbar = ({ tab, onTabChange, filter, onFilterChange, query, onQueryChange, counts, live = true }) => {
  const isCurrentTab = tab === STANDINGS_TAB.CURRENT;
  return (
    <div className="consistency-toolbar">
      <div className="consistency-toolbar__head">
        <Tabs ariaLabel="Visão do ranking" tabs={TAB_ITEMS} value={tab} onChange={onTabChange} />
        {isCurrentTab && (
          <div className="input--search-wrap consistency-toolbar__search">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              className="input input--search"
              placeholder="Buscar aluno"
              aria-label="Buscar aluno"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        )}
      </div>
      {isCurrentTab && <StandingsFilters filter={filter} onFilterChange={onFilterChange} counts={counts} live={live} />}
    </div>
  );
};

StandingsToolbar.propTypes = {
  tab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
  live: PropTypes.bool,
};

export default StandingsToolbar;
