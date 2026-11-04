import PropTypes from 'prop-types';
import Toggle from '../ds/Toggle';
import { macroCheck } from '../../utils/nutritionCalc';
import { formatInteger, parseNumberInput } from '../../utils/nutritionFormat';
import MacroSplitBar from './MacroSplitBar';
import MacroTable from './MacroTable';

// Message under the table about how the macros close the calorie target.
const checkMessage = (macros, carbIsRemainder) => {
  const { level, diffKcal } = macroCheck(macros, { carbIsRemainder });
  if (level === 'over_target') return 'Proteína e lipídio já passam da meta calórica. Revê os g/kg ou a meta.';
  if (level === 'ok') return `Os macros fecham ${formatInteger(macros.totalKcal)} kcal, igual à meta.`;
  return `Os macros somam ${formatInteger(macros.totalKcal)} kcal, ${formatInteger(Math.abs(diffKcal))} ${diffKcal > 0 ? 'acima' : 'abaixo'} da meta calórica.`;
};

// Display value of the carbs g/kg: typed value, or the one the remainder implies.
const carbPerKgValue = (goals, macros, weightKg) => {
  if (!goals.carbIsRemainder) return goals.carbPerKg;
  return macros && weightKg ? Math.round((macros.carbs.grams / weightKg) * 100) / 100 : null;
};

// Check box under the table: info when the macros close the target, warning otherwise.
const CheckMessage = ({ macros, carbIsRemainder }) => {
  if (!macros) return <p className="macro-check">Defina a meta calórica para ver os macros.</p>;
  const isOk = macroCheck(macros, { carbIsRemainder }).level === 'ok';
  return <p className={`macro-check macro-check--${isOk ? 'ok' : 'warning'}`} role="status">{checkMessage(macros, carbIsRemainder)}</p>;
};

CheckMessage.propTypes = { macros: PropTypes.object, carbIsRemainder: PropTypes.bool.isRequired };

// Right card of the goals step: calorie target, nutrient table, remainder switch, check and VET split.
const MacroTargetsCard = ({ goals, macros, weightKg, suggestion, onChange }) => {
  const update = (changes) => onChange({ ...goals, ...changes });
  const carbPerKg = carbPerKgValue(goals, macros, weightKg);
  const handleRemainderChange = (isRemainder) => {
    const typedValue = carbPerKg == null ? null : Math.round(carbPerKg * 10) / 10;
    update({ carbIsRemainder: isRemainder, carbPerKg: isRemainder ? goals.carbPerKg : typedValue });
  };

  return (
    <section className="goals-card" aria-labelledby="macro-card-title">
      <h2 id="macro-card-title" className="goals-card__title">Metas nutricionais</h2>
      <p className="goals-card__subtitle">Alimentam a tabela do cardápio e o resumo do plano.</p>
      <div className="prescription-field">
        <label className="prescription-label" htmlFor="kcal-target">Meta calórica</label>
        <div className="macro-target">
          <input
            id="kcal-target"
            type="number"
            min="0"
            step="10"
            className="input macro-target__input"
            value={goals.kcalTarget ?? ''}
            onChange={(event) => update({ kcalTarget: parseNumberInput(event.target.value) })}
          />
          <span className="macro-table__unit">kcal</span>
          {suggestion != null && (
            <button type="button" className="prescription-chip-button" onClick={() => update({ kcalTarget: Math.round(suggestion) })}>
              Usar sugestão · {formatInteger(suggestion)}
            </button>
          )}
        </div>
      </div>
      <MacroTable goals={goals} macros={macros} carbPerKg={carbPerKg} onChange={update} />
      <label className="macro-remainder">
        <Toggle checked={goals.carbIsRemainder} onChange={handleRemainderChange} label="Carboidrato completa as calorias que faltam" />
        <span>Carboidrato completa as calorias que faltam</span>
      </label>
      <CheckMessage macros={macros} carbIsRemainder={goals.carbIsRemainder} />
      <MacroSplitBar macros={macros} />
    </section>
  );
};

MacroTargetsCard.propTypes = {
  goals: PropTypes.object.isRequired,
  macros: PropTypes.object,
  weightKg: PropTypes.number,
  suggestion: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

export default MacroTargetsCard;
