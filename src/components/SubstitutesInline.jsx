import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { t } from '../i18n';

/**
 * Single-line preview of an exercise's substitutes shown directly under
 * its row. Format:
 *   - 1 substitute  → "Substituto: Cadeira extensora"
 *   - 2+ substitute → "Substituto: Cadeira extensora +N"
 *
 * Tap toggles an accordion (parent owns the open state). The component
 * is purely presentational — it does not fetch substitutes.
 */
const SubstitutesInline = ({ substitutes = [], expanded = false, onToggle }) => {
  if (!substitutes || substitutes.length === 0) return null;

  const firstName = substitutes[0]?.name || '—';
  const extraCount = substitutes.length - 1;
  const prefix = t('substitute.inlinePrefix') || 'Substituto: ';

  return (
    <button
      type="button"
      className="substitutes-inline"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${prefix.trim()} ${firstName}${extraCount > 0 ? ` e mais ${extraCount}` : ''}`}
    >
      <span className="substitutes-inline-prefix type-caption">{prefix}</span>
      <span className="substitutes-inline-name type-caption-strong">{firstName}</span>
      {extraCount > 0 && (
        <span className="substitutes-inline-extra type-caption-strong">+{extraCount}</span>
      )}
      <ChevronDown
        size={16}
        strokeWidth={2}
        className="substitutes-inline-chevron"
        aria-hidden="true"
      />
    </button>
  );
};

SubstitutesInline.propTypes = {
  substitutes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    })
  ),
  expanded: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

export default SubstitutesInline;
