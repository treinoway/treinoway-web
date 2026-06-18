import PropTypes from 'prop-types';
import { SearchX } from 'lucide-react';
import RowMenu from './RowMenu';

/**
 * LibraryListRow — one row in the Biblioteca unified list.
 * Matches the visual treatment of the Students page (student-stat-row pattern):
 * identity block on the left, optional inline stats on the right, ghost menu button.
 *
 * Props:
 *  - title (string, required)          — primary display name
 *  - subtitle (string)                 — secondary metadata line shown below title
 *  - badges (node)                     — badge elements rendered beside the title
 *  - stats (node)                      — optional stat chips rendered to the right on desktop
 *  - rowMenuProps (object)             — forwarded to RowMenu (ariaLabel, onEdit, onDelete, …)
 *  - onClick (func)                    — row click handler
 *  - ariaLabel (string)                — aria-label for the row button
 *  - selectable (bool)                 — when true, renders a leading selection checkbox
 *  - selected (bool)                   — checkbox checked state
 *  - onToggleSelect (func)             — called when the checkbox is toggled
 *  - selectAriaLabel (string)          — aria-label for the selection checkbox
 */
export const LibraryListRow = ({
  title,
  subtitle,
  badges,
  stats,
  rowMenuProps,
  onClick,
  ariaLabel,
  selectable = false,
  selected = false,
  onToggleSelect,
  selectAriaLabel,
}) => (
  <div
    className="library-stat-row"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    }}
    aria-label={ariaLabel}
  >
    <div className="library-stat-row-identity">
      {selectable && (
        <span
          className="library-row-checkbox-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="library-row-checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.()}
            aria-label={selectAriaLabel}
          />
        </span>
      )}
      <div className="library-stat-row-name-block">
        <div className="library-stat-row-title-line">
          <span className="library-stat-row-name">{title}</span>
          {badges && <div className="library-row-badges">{badges}</div>}
        </div>
        {subtitle && (
          <span className="library-stat-row-meta">{subtitle}</span>
        )}
      </div>
    </div>

    {stats && (
      <div className="library-stat-row-stats">
        {stats}
      </div>
    )}

    {rowMenuProps && (
      <RowMenu {...rowMenuProps} />
    )}
  </div>
);

LibraryListRow.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badges: PropTypes.node,
  stats: PropTypes.node,
  rowMenuProps: PropTypes.object,
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  selectAriaLabel: PropTypes.string,
};

/**
 * LibraryList — the unified Biblioteca list container.
 * Renders each row as an individual card (student-stat-row style).
 *
 * Props:
 *  - children        — LibraryListRow elements
 *  - emptyMessage    — text shown when children is empty (triggers no-results state)
 *  - isNoResults     — when true renders no-results icon state; when false renders plain empty-state text
 */
const LibraryList = ({
  children,
  emptyMessage = 'Nenhum item encontrado',
  isNoResults = false,
}) => {
  // Flatten one level so an empty `.map()` (which yields a truthy []) does not
  // count as a rendered row — this keeps the no-results state working when the
  // list mixes a conditional row with a mapped collection.
  const hasChildren = Array.isArray(children)
    ? children.flat().filter(Boolean).length > 0
    : !!children;

  if (!hasChildren) {
    if (isNoResults) {
      return (
        <div className="students-no-results">
          <div className="students-no-results-icon">
            <SearchX size={28} strokeWidth={2} />
          </div>
          <p className="students-empty-state-eyebrow">Sem resultados</p>
          <p className="students-empty-state-desc">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="library-empty-notice">
        <span className="eyebrow">{emptyMessage}</span>
      </div>
    );
  }

  return <div className="students-list">{children}</div>;
};

LibraryList.propTypes = {
  children: PropTypes.node,
  emptyMessage: PropTypes.string,
  isNoResults: PropTypes.bool,
};

export default LibraryList;
