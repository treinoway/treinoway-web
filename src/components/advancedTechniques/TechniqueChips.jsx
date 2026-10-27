import PropTypes from 'prop-types';
import { Zap } from 'lucide-react';
import { tf } from '../../i18n';
import { sortTechniquesByOrder, withoutDeletedTechniques } from '../../utils/advancedTechniques';

const MAX_VISIBLE_CHIPS = 2;

// Orange pills for an exercise's live advanced techniques: first two plus a +N chip; nothing when empty.
const TechniqueChips = ({ techniques }) => {
  const live = sortTechniquesByOrder(withoutDeletedTechniques(techniques));
  if (live.length === 0) return null;

  const overflow = live.length > MAX_VISIBLE_CHIPS ? live.length - MAX_VISIBLE_CHIPS : 0;
  const visible = overflow ? live.slice(0, MAX_VISIBLE_CHIPS) : live;
  const fullLabel = tf('techniqueChips.groupLabel', { names: live.map((technique) => technique.name).join(', ') });

  return (
    <span className="technique-chips" role="group" aria-label={fullLabel} title={fullLabel}>
      {visible.map((technique) => (
        <span key={technique.id ?? technique.name} className="technique-chip" aria-hidden="true">
          <Zap size={12} strokeWidth={2} aria-hidden="true" />
          {technique.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="technique-chip" aria-hidden="true">
          {tf('techniqueChips.overflow', { count: overflow })}
        </span>
      )}
    </span>
  );
};

TechniqueChips.propTypes = {
  techniques: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      isDeleted: PropTypes.bool,
      order: PropTypes.number,
    }),
  ),
};

export default TechniqueChips;
