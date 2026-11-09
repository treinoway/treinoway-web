import PropTypes from 'prop-types';
import NutrientGoalTile from '../ds/NutrientGoalTile';
import { formatDecimal, formatFlexible } from '../../utils/nutritionFormat';
import { DAY_NUTRIENTS, dayStatus, vetShares } from '../../utils/planView';

const PERCENT = 100;

// Extra line under a tile: share of the goal, g/kg, share of the VET or the fiber minimum.
const extraLine = (key, { totals, goals, weightKg, shares }) => {
  if (key === 'kcal') return `${Math.round((totals.kcal / goals.kcal) * PERCENT)}% da meta`;
  if (key === 'protein') return weightKg > 0 ? `${formatDecimal(totals.protein / weightKg)} de ${formatDecimal(goals.protein / weightKg)} g/kg` : undefined;
  if (key === 'fiber') return `mínimo de ${formatFlexible(goals.fiber)} g`;
  return shares[key] == null ? undefined : `${formatDecimal(shares[key])}% do VET`;
};

// Tiles of the day totals (option 1 of each meal) against the goals; fiber is a minimum.
const DayGoalTiles = ({ totals, goals, weightKg = null }) => {
  const tiles = DAY_NUTRIENTS.filter((nutrient) => goals[nutrient.key] != null);
  if (tiles.length === 0) {
    return <p className="type-body">Defina as metas na etapa anterior para comparar o dia com elas.</p>;
  }
  const context = { totals, goals, weightKg, shares: vetShares(totals) };
  return (
    <div className="day-goal-tiles">
      {tiles.map((nutrient) => (
        <NutrientGoalTile
          key={nutrient.key}
          label={nutrient.label}
          value={totals[nutrient.key]}
          goal={goals[nutrient.key]}
          unit={nutrient.unit}
          status={dayStatus(nutrient, totals[nutrient.key], goals[nutrient.key])}
          isMinimum={nutrient.isMinimum}
          extra={extraLine(nutrient.key, context)}
        />
      ))}
    </div>
  );
};

DayGoalTiles.propTypes = {
  totals: PropTypes.object.isRequired,
  goals: PropTypes.object.isRequired,
  weightKg: PropTypes.number,
};

export default DayGoalTiles;
