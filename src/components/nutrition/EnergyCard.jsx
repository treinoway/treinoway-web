import PropTypes from 'prop-types';
import { ACTIVITY_FACTOR_OPTIONS, BMR_FORMULA_OPTIONS, OBJECTIVE_OPTIONS } from '../../constants/nutrition';
import { computeLeanMassKg } from '../../utils/nutritionCalc';
import { formatDecimal } from '../../utils/nutritionFormat';
import ActivitiesCard from './ActivitiesCard';
import EnergyPanel from './EnergyPanel';
import SelectField from './SelectField';
import SheetCard from './SheetCard';

const PROTOCOL_NOTES = {
  mifflin: 'Boa precisão pra adultos. Usa peso, altura, idade e sexo.',
  harris_benedict: 'Clássica e bem conhecida. Costuma dar um pouco acima.',
  fao_who: 'Usa só o peso, pela faixa de idade do paciente.',
};
const ROUTINE_NOTE = 'Os treinos entram separados, por MET, pra não contar duas vezes.';

// Note under the protocol select; Katch-McArdle depends on the lean mass of the sheet.
const protocolNote = (formula, sheet) => {
  if (formula !== 'katch_mcardle') return PROTOCOL_NOTES[formula];
  const leanMassKg = computeLeanMassKg(sheet);
  if (leanMassKg == null) return 'Informe o % de gordura na ficha para usar este protocolo.';
  return `Usa a massa magra da avaliação: ${formatDecimal(leanMassKg)} kg.`;
};

// Left card of the goals step: sheet, protocol, routine, activities, objective and the energy total.
const EnergyCard = ({ goals, sheet, panel, sheetComplete, trainerName, onGoalChange, onEditSheet }) => {
  const formula = BMR_FORMULA_OPTIONS.find((option) => option.value === goals.bmrFormula);
  return (
    <section className="goals-card" aria-labelledby="energy-card-title">
      <h2 id="energy-card-title" className="goals-card__title">Gasto energético</h2>
      <p className="goals-card__subtitle">Calcula o GET pra sugerir a meta calórica.</p>
      <SheetCard sheet={sheet} complete={sheetComplete} onEdit={onEditSheet} />
      <SelectField id="bmr-formula" label="Protocolo da TMB" options={BMR_FORMULA_OPTIONS} value={goals.bmrFormula} onChange={onGoalChange('bmrFormula')} note={protocolNote(goals.bmrFormula, sheet)} />
      <SelectField id="activity-factor" label="Rotina fora dos treinos" options={ACTIVITY_FACTOR_OPTIONS} value={goals.activityFactor} onChange={onGoalChange('activityFactor')} note={ROUTINE_NOTE} />
      <ActivitiesCard activities={goals.activities} weightKg={sheet.weightKg ?? 0} trainerName={trainerName} onChange={onGoalChange('activities')} />
      <SelectField id="objective" label="Objetivo" options={OBJECTIVE_OPTIONS} value={goals.objective} onChange={onGoalChange('objective')} />
      <EnergyPanel panel={panel} formulaName={formula.short} factor={goals.activityFactor} />
    </section>
  );
};

EnergyCard.propTypes = {
  goals: PropTypes.object.isRequired,
  sheet: PropTypes.object.isRequired,
  panel: PropTypes.object,
  sheetComplete: PropTypes.bool.isRequired,
  trainerName: PropTypes.string,
  onGoalChange: PropTypes.func.isRequired,
  onEditSheet: PropTypes.func.isRequired,
};

export default EnergyCard;
