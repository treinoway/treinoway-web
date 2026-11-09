import PropTypes from 'prop-types';
import { VET_MACROS, vetShares } from '../../utils/planView';
import { formatDecimal } from '../../utils/nutritionFormat';

// Percent text with one decimal, "-" when unknown.
const percentOrDash = (value) => (value == null ? '-' : `${formatDecimal(value)}%`);

// Width (%) of a bar segment, rounded to two decimals.
const barWidth = (share) => Math.round((share ?? 0) * 100) / 100;

// Stacked bar and legend: the share of the day energy (VET) each macro takes in the menu, next to the goal share.
const VetDistribution = ({ totals, macros }) => {
  const shares = vetShares(totals);
  return (
    <section className="vet-distribution" aria-label="Distribuição do VET">
      <h3 className="vet-distribution__title">Distribuição do VET</h3>
      <div className="vet-distribution__bar" aria-hidden="true">
        {VET_MACROS.map(({ key }) => (
          <span key={key} className={`vet-distribution__segment vet-distribution__segment--${key}`} style={{ width: `${barWidth(shares[key])}%` }} />
        ))}
      </div>
      <ul className="vet-distribution__legend">
        {VET_MACROS.map(({ key, label }) => (
          <li key={key} className="vet-distribution__item">
            <span className={`vet-distribution__swatch vet-distribution__swatch--${key}`} aria-hidden="true" />
            <strong>{`${label} ${percentOrDash(shares[key])}`}</strong>
            {' '}
            <span>{`· meta ${percentOrDash(macros?.[key]?.pct)}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

VetDistribution.propTypes = {
  totals: PropTypes.object.isRequired,
  macros: PropTypes.object,
};

export default VetDistribution;
