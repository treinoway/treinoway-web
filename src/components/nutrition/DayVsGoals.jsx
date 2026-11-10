import PropTypes from 'prop-types';
import { formatDecimal, formatInteger } from '../../utils/nutritionFormat';
import { dayStatus } from '../../utils/planView';

const PERCENT = 100;
const MACROS = [
  { key: 'protein', label: 'Proteína' },
  { key: 'carbs', label: 'Carboidrato' },
  { key: 'fat', label: 'Gordura' },
];

// Progress of a value against its goal as a 0-100 integer.
const toProgress = (value, goal) => (goal > 0 ? Math.min(PERCENT, Math.max(0, Math.round((value / goal) * PERCENT))) : 0);

// Progress bar (the fill turns to the accent colour when the nutrient is low).
const GoalBar = ({ label, value, goal, low = false, thick = false }) => (
  <div
    className={`nutri-bar${thick ? ' nutri-bar--thick' : ''}`}
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={PERCENT}
    aria-valuenow={toProgress(value, goal)}
  >
    <span className={`nutri-bar__fill${low ? ' nutri-bar__fill--low' : ''}`} style={{ width: `${toProgress(value, goal)}%` }} />
  </div>
);

GoalBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
  low: PropTypes.bool,
  thick: PropTypes.bool,
};

// One macro row: name, "102 g / 119 g · 1,5 g/kg", the bar and the grams below the goal.
const MacroRow = ({ macro, total, goal, weightKg }) => {
  const hasGoal = goal != null;
  const isLow = hasGoal && dayStatus({ key: macro.key }, total, goal) === 'low';
  const perKg = macro.key === 'protein' && weightKg ? ` · ${formatDecimal(total / weightKg)} g/kg` : '';
  return (
    <div className="nutri-macro">
      <div className="nutri-macro__line">
        <span className="nutri-macro__name">{macro.label}</span>
        <span className="nutri-macro__figures">
          <strong>{`${formatInteger(total)} g`}</strong>
          {hasGoal && <span className="nutri-macro__goal">{`/ ${formatInteger(goal)} g${perKg}`}</span>}
        </span>
      </div>
      {hasGoal && <GoalBar label={macro.label} value={total} goal={goal} low={isLow} />}
      {isLow && <p className="nutri-macro__warning">{`${formatInteger(goal - total)} g abaixo da meta`}</p>}
    </div>
  );
};

MacroRow.propTypes = {
  macro: PropTypes.shape({ key: PropTypes.string, label: PropTypes.string }).isRequired,
  total: PropTypes.number.isRequired,
  goal: PropTypes.number,
  weightKg: PropTypes.number,
};

// Day summary against the goals: kcal with a bar and one row per macro.
const DayVsGoals = ({ totals, goals, weightKg }) => {
  const hasKcalGoal = goals.kcal != null;
  return (
    <section className="nutri-card day-vs-goals" aria-label="Resumo do dia">
      <h2 className="nutri-card__title">Resumo do dia</h2>
      <p className="nutri-card__subtitle">{hasKcalGoal ? 'Metas vindas da anamnese' : 'Sem metas definidas'}</p>
      <p className="nutri-day__kcal">
        <span className="nutri-day__value">{formatInteger(totals.kcal)}</span>
        {hasKcalGoal ? (
          <span className="nutri-day__goal">{`/ ${formatInteger(goals.kcal)} kcal`}</span>
        ) : (
          <span className="nutri-day__goal"> kcal</span>
        )}
      </p>
      {hasKcalGoal && <GoalBar label="Energia" value={totals.kcal} goal={goals.kcal} thick />}
      <div className="nutri-macros">
        {MACROS.map((macro) => (
          <MacroRow key={macro.key} macro={macro} total={totals[macro.key]} goal={goals[macro.key]} weightKg={weightKg} />
        ))}
      </div>
    </section>
  );
};

DayVsGoals.propTypes = {
  totals: PropTypes.object.isRequired,
  goals: PropTypes.object.isRequired,
  weightKg: PropTypes.number,
};

export default DayVsGoals;
