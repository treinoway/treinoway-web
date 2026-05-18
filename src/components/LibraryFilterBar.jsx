import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

/**
 * LibraryFilterBar — standardised search + filter-tab toolbar for Biblioteca pages.
 * Matches the visual treatment of the Students page toolbar exactly.
 *
 * Props:
 *  - searchValue (string)           — current search input value
 *  - onSearchChange (func)          — called with new value on every keystroke
 *  - searchPlaceholder (string)     — placeholder text for the search input
 *  - searchAriaLabel (string)       — aria-label for the search input
 *  - filters (array)                — [{ value, label }] filter options
 *  - activeFilter (string)          — currently active filter value
 *  - onFilterChange (func)          — called with filter value when a tab is clicked
 *  - filterCounts (object)          — optional { [filterValue]: count } to show counts on tabs
 *  - sortSelect (node)              — optional sort <select> rendered at the trailing end
 */
const LibraryFilterBar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar…',
  searchAriaLabel = 'Buscar',
  filters = [],
  activeFilter,
  onFilterChange,
  filterCounts,
  sortSelect,
}) => (
  <div className="students-toolbar" role="search">
    <div className="students-search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="text"
        className="students-search-input"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={searchAriaLabel}
      />
    </div>

    {filters.length > 0 && (
      <div className="students-filter-group" role="tablist" aria-label="Filtrar">
        {filters.map((f) => {
          const count = filterCounts?.[f.value];
          const isActive = activeFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              className={`students-filter-btn${isActive ? ' active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
              {count != null && (
                <span className="students-filter-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    )}

    {sortSelect}
  </div>
);

LibraryFilterBar.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  searchAriaLabel: PropTypes.string,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ),
  activeFilter: PropTypes.string,
  onFilterChange: PropTypes.func,
  filterCounts: PropTypes.object,
  sortSelect: PropTypes.node,
};

export default LibraryFilterBar;
