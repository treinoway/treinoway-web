import PropTypes from 'prop-types';
import { formatDecimal } from '../../utils/nutritionFormat';

const MACRO_PARTS = [
  { key: 'protein', tone: 'protein', label: 'Proteína' },
  { key: 'carbs', tone: 'carbs', label: 'Carboidrato' },
  { key: 'fat', tone: 'fat', label: 'Lipídio' },
];

// Share of the day energy (VET) of each macro as a stacked bar with a text legend.
const MacroSplitBar = ({ macros }) => (
  <section className="macro-split" aria-label="Distribuição do VET">
    <p className="prescription-eyebrow">Distribuição do VET</p>
    <div className="macro-split__bar" aria-hidden="true">
      {macros && MACRO_PARTS.map(({ key, tone }) => (
        <span key={key} className={`macro-split__part macro-split__part--${tone}`} style={{ width: `${macros[key].pct}%` }} />
      ))}
    </div>
    <p className="macro-split__legend">
      {MACRO_PARTS.map(({ key, label }) => `${label} ${macros ? `${formatDecimal(macros[key].pct)}%` : '-'}`).join(' · ')}
    </p>
  </section>
);

MacroSplitBar.propTypes = { macros: PropTypes.object };

export default MacroSplitBar;
