import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import Segmented from './ds/Segmented';

// A "(0)" next to a visible row (e.g. a local draft) is misleading, so zero is omitted.
const countOrNothing = (count) => (count > 0 ? count : undefined);

/**
 * LibraryFilterBar — search + segmented filter toolbar for Biblioteca pages.
 * Same markup as the Students toolbar (`students-bar`).
 *
 * Props:
 *  - searchValue / onSearchChange     — controlled search input
 *  - searchPlaceholder / searchAriaLabel
 *  - filters ([{ value, label, count? }]) — segmented tabs
 *  - activeFilter / onFilterChange    — selected tab and change handler
 *  - filterCounts ({ [value]: number }) — optional counts (overridden by filter.count)
 *  - filtersAriaLabel (string)        — aria-label of the tablist
 *  - sortSelect (node)                — optional trailing slot (sort / extra select)
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
  filtersAriaLabel = 'Filtrar',
  sortSelect,
}) => {
  const items = filters.map(({ value, label, count }) => ({
    id: value,
    label,
    count: countOrNothing(count ?? filterCounts?.[value]),
  }));

  return (
    <div className="students-bar section-card section-card--compact" role="search">
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          type="text"
          className="input input--search input--on-elevated"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={searchAriaLabel}
        />
      </div>
      {items.length > 0 && (
        <Segmented
          ariaLabel={filtersAriaLabel}
          items={items}
          value={activeFilter}
          onChange={onFilterChange}
        />
      )}
      {sortSelect && <div className="students-bar__slot">{sortSelect}</div>}
    </div>
  );
};

LibraryFilterBar.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  searchAriaLabel: PropTypes.string,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
    }),
  ),
  activeFilter: PropTypes.string,
  onFilterChange: PropTypes.func,
  filterCounts: PropTypes.objectOf(PropTypes.number),
  filtersAriaLabel: PropTypes.string,
  sortSelect: PropTypes.node,
};

export default LibraryFilterBar;
