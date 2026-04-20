import PropTypes from 'prop-types';
import { calculateMacroPercentages, formatMacro } from '../utils/dietMacros';

/**
 * Accessible MacroBar with inline labels.
 * Each segment shows: macro name + grams + percentage.
 */
const MacroBar = ({ proteinG, carbsG, fatG }) => {
  const pct = calculateMacroPercentages(proteinG, carbsG, fatG);
  const hasData = (proteinG || carbsG || fatG);

  return (
    <div className="macro-bar-wrapper" aria-label="Distribuição de macronutrientes">
      {/* Visual bar */}
      <div className="macro-bar" role="presentation">
        {pct.protein > 0 && (
          <div
            className="macro-bar-segment macro-bar-segment--protein"
            style={{ width: `${pct.protein}%` }}
            aria-hidden="true"
          />
        )}
        {pct.carbs > 0 && (
          <div
            className="macro-bar-segment macro-bar-segment--carbs"
            style={{ width: `${pct.carbs}%` }}
            aria-hidden="true"
          />
        )}
        {pct.fat > 0 && (
          <div
            className="macro-bar-segment macro-bar-segment--fat"
            style={{ width: `${pct.fat}%` }}
            aria-hidden="true"
          />
        )}
        {!hasData && (
          <div className="macro-bar-segment macro-bar-segment--empty" style={{ width: '100%' }} aria-hidden="true" />
        )}
      </div>

      {/* Inline labels */}
      <div className="macro-bar-labels">
        <div className="macro-bar-label">
          <span className="macro-bar-label-dot macro-bar-label-dot--protein" aria-hidden="true" />
          <span>
            Prot: <strong>{formatMacro(proteinG)}</strong>g
            {pct.protein > 0 && <span className="macro-bar-label-pct"> ({pct.protein}%)</span>}
          </span>
        </div>
        <div className="macro-bar-label">
          <span className="macro-bar-label-dot macro-bar-label-dot--carbs" aria-hidden="true" />
          <span>
            Carb: <strong>{formatMacro(carbsG)}</strong>g
            {pct.carbs > 0 && <span className="macro-bar-label-pct"> ({pct.carbs}%)</span>}
          </span>
        </div>
        <div className="macro-bar-label">
          <span className="macro-bar-label-dot macro-bar-label-dot--fat" aria-hidden="true" />
          <span>
            Gord: <strong>{formatMacro(fatG)}</strong>g
            {pct.fat > 0 && <span className="macro-bar-label-pct"> ({pct.fat}%)</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

MacroBar.propTypes = {
  proteinG: PropTypes.number,
  carbsG: PropTypes.number,
  fatG: PropTypes.number,
};

MacroBar.defaultProps = {
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

export default MacroBar;
