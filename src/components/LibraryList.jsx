import PropTypes from 'prop-types';
import { Inbox, SearchX } from 'lucide-react';
import Badge from './ds/Badge';
import EmptyBlock from './ds/EmptyBlock';
import RowMenu from './RowMenu';

const BADGE_TONE_ALIASES = {
  blue: 'brand',
  primary: 'brand',
  gray: 'neutral',
  green: 'success',
  accent: 'warning',
};

const resolveTone = (tone = 'neutral') => BADGE_TONE_ALIASES[tone] ?? tone;

/**
 * LibraryListRow — one row of a Biblioteca list, same anatomy as StudentRow.
 *
 * Props:
 *  - title (string, required)
 *  - subtitle (string)                  — caption line under the meta badges
 *  - badges ([{ label, tone, variant }]) — rendered with ds/Badge. `tone` accepts the
 *      ds tones plus legacy aliases (blue/primary -> brand, gray -> neutral,
 *      green -> success, accent -> warning)
 *  - stats ([{ icon, label }])          — compact caption stats with optional lucide icon
 *  - rowMenuProps (object)              — forwarded to RowMenu
 *  - onOpen (func)                      — makes the title a stretched link (whole row clickable)
 *  - ariaLabel (string)                 — aria-label for the title button
 *  - selectable / selected / onToggleSelect / selectAriaLabel — optional leading checkbox
 *  - selectDisabled (bool)              — keeps the checkbox column but disables it (row not selectable)
 */
export const LibraryListRow = ({
  title,
  subtitle,
  badges = [],
  stats = [],
  rowMenuProps,
  onOpen,
  ariaLabel,
  selectable = false,
  selected = false,
  onToggleSelect,
  selectAriaLabel,
  selectDisabled = false,
}) => (
  <div className={`library-row${selectable ? ' library-row--selectable' : ''}`}>
    {selectable && (
      <input
        type="checkbox"
        className="library-row__checkbox"
        checked={selected}
        onChange={() => onToggleSelect?.()}
        disabled={selectDisabled}
        aria-label={selectAriaLabel}
      />
    )}
    <div className="library-row__identity">
      {onOpen ? (
        <button
          type="button"
          className="library-row__link type-h4"
          aria-label={ariaLabel}
          onClick={onOpen}
        >
          {title}
        </button>
      ) : (
        <span className="library-row__title type-h4">{title}</span>
      )}
      {badges.length > 0 && (
        <div className="library-row__meta">
          {badges.map(({ label, tone, variant }) => (
            <Badge key={label} tone={resolveTone(tone)} variant={variant}>
              {label}
            </Badge>
          ))}
        </div>
      )}
      {subtitle && <span className="library-row__subtitle type-caption">{subtitle}</span>}
    </div>
    {stats.length > 0 && (
      <div className="library-row__stats">
        {stats.map(({ icon: Icon, label }) => (
          <span key={label} className="library-row__stat type-caption">
            {Icon && <Icon size={16} strokeWidth={2} aria-hidden="true" />}
            {label}
          </span>
        ))}
      </div>
    )}
    {rowMenuProps && (
      <div className="library-row__action">
        <RowMenu {...rowMenuProps} />
      </div>
    )}
  </div>
);

LibraryListRow.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      tone: PropTypes.string,
      variant: PropTypes.oneOf(['status', 'tag']),
    }),
  ),
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.elementType,
      label: PropTypes.string.isRequired,
    }),
  ),
  rowMenuProps: PropTypes.object,
  onOpen: PropTypes.func,
  ariaLabel: PropTypes.string,
  selectable: PropTypes.bool,
  selected: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  selectAriaLabel: PropTypes.string,
  selectDisabled: PropTypes.bool,
};

/**
 * LibraryList — Biblioteca list container.
 *
 * Props:
 *  - children      — LibraryListRow elements
 *  - emptyMessage  — text for the empty state (description when isNoResults, title otherwise)
 *  - isNoResults   — true renders "Sem resultados" EmptyBlock
 */
const LibraryList = ({
  children,
  emptyMessage = 'Nenhum item encontrado',
  isNoResults = false,
}) => {
  // Flatten one level so an empty `.map()` (a truthy []) does not count as a row.
  const hasChildren = Array.isArray(children)
    ? children.flat().filter(Boolean).length > 0
    : !!children;

  if (hasChildren) return <div className="library-list">{children}</div>;

  if (isNoResults) {
    return <EmptyBlock icon={SearchX} title="Sem resultados" description={emptyMessage} />;
  }
  return <EmptyBlock icon={Inbox} title={emptyMessage} />;
};

LibraryList.propTypes = {
  children: PropTypes.node,
  emptyMessage: PropTypes.string,
  isNoResults: PropTypes.bool,
};

export default LibraryList;
