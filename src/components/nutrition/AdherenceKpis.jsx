import PropTypes from 'prop-types';
import { formatFlexible, formatInteger } from '../../utils/nutritionFormat';

// One KPI tile: eyebrow label, big value and a supporting line.
const KpiTile = ({ label, value, support, brand = false }) => (
  <div className="nutri-kpi">
    <span className="nutri-eyebrow">{label}</span>
    <span className={`nutri-kpi__value${brand ? ' nutri-kpi__value--brand' : ''}`}>{value}</span>
    {support && <span className="nutri-kpi__support">{support}</span>}
  </div>
);

KpiTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  support: PropTypes.string,
  brand: PropTypes.bool,
};

// Three 7-day KPI tiles: adherence, swaps used and "comeu diferente" (rendered inside the hero KPI grid).
const AdherenceKpis = ({ adherence }) => {
  const { swaps, ateDifferent } = adherence;
  return (
    <>
      <KpiTile
        label="Adesão · 7 dias"
        value={`${formatFlexible(adherence.percent)}%`}
        support={`${formatInteger(adherence.mealsDone)} de ${formatInteger(adherence.mealsExpected)} refeições`}
        brand
      />
      <KpiTile
        label="Trocas usadas"
        value={formatInteger(swaps.total)}
        support={swaps.topPair ? `Mais pedida: ${swaps.topPair.from} → ${swaps.topPair.to}` : undefined}
      />
      <KpiTile
        label="Comeu diferente"
        value={formatInteger(ateDifferent.total)}
        support={ateDifferent.topMealName ? `Mais em: ${ateDifferent.topMealName}` : undefined}
      />
    </>
  );
};

AdherenceKpis.propTypes = {
  adherence: PropTypes.shape({
    percent: PropTypes.number,
    mealsDone: PropTypes.number,
    mealsExpected: PropTypes.number,
    swaps: PropTypes.object,
    ateDifferent: PropTypes.object,
  }).isRequired,
};

export default AdherenceKpis;
