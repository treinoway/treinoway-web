import PropTypes from 'prop-types';
import { CONFIG_LIMITS } from '../../constants/consistencyRanking';

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WORKOUT_MINUTES_STEP = 5;
const RISK_LIMIT_STEP = 5;
const BATCH_COUNT_CHOICES = [3, 5, 8, 10, 15, 20];
const BATCH_MINUTES_CHOICES = [10, 20, 30, 45, 60, 90, 120];

// Whole numbers from min to max, one every `step`
const rangeOf = ({ min, max }, step = 1) => Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step);

// Options of a select: the usual steps plus the saved value when it falls between them
const optionsFor = (values, current, labelOf) => {
  const all = values.includes(current) ? values : [...values, current].sort((a, b) => a - b);
  return all.map((value) => ({ value, label: labelOf(value) }));
};

// "N semana(s) válida(s)" label of the podium minimum
const podiumLabelOf = (weeks) => `${weeks} ${weeks === 1 ? 'semana válida' : 'semanas válidas'}`;

// "N semana(s)" label
const weeksLabelOf = (weeks) => `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;

// "Abaixo de 70% por 2 semanas" label of the risk alert rule
const riskLabelOf = (limit, weeks) => `Abaixo de ${limit}% por ${weeksLabelOf(weeks)}`;

// "5 registros em 30 min" label of the batch registration rule
const batchLabelOf = (count, minutes) => `${count} registros em ${minutes} min`;

// "HH:00" label of a close hour
const hourLabelOf = (hour) => `${String(hour).padStart(2, '0')}:00`;

// Select of one numeric rule; the change goes up as a number
const RuleSelect = ({ id, label, value, options, onChange }) => (
  <select id={id} className="input" aria-label={label} value={value} onChange={(event) => onChange(Number(event.target.value))}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

RuleSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.number.isRequired, label: PropTypes.string.isRequired })).isRequired,
  onChange: PropTypes.func.isRequired,
};

// Every first x second pairing, plus the saved pair when it is not one of them, as options of a combined select
const pairOptions = (firsts, seconds, current, labelOf) => {
  const pairs = firsts.flatMap((first) => seconds.map((second) => [first, second]));
  const saved = pairs.some(([first, second]) => first === current[0] && second === current[1]) ? pairs : [...pairs, current];
  return saved.map(([first, second]) => ({ value: `${first}:${second}`, label: labelOf(first, second) }));
};

// One select that sets two numeric rules at once; its value is "first:second"
const PairSelect = ({ id, label, pair, options, onChange }) => (
  <select
    id={id}
    className="input"
    aria-label={label}
    value={`${pair[0]}:${pair[1]}`}
    onChange={(event) => onChange(event.target.value.split(':').map(Number))}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

PairSelect.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  pair: PropTypes.arrayOf(PropTypes.number).isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })).isRequired,
  onChange: PropTypes.func.isRequired,
};

// One rule of the fairness block: a title, one or two selects and a support text
const RuleField = ({ title, hint, children }) => (
  <fieldset className="rules-section__field">
    <legend className="field-label type-caption-strong">{title}</legend>
    <div className="rules-section__controls">{children}</div>
    <p className="field-hint type-caption rules-section__hint">{hint}</p>
  </fieldset>
);

RuleField.propTypes = {
  title: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Fairness rules of the ranking: podium minimum, close, minimum workout time, risk alert and batch registration
const RulesSection = ({ config, onChange }) => {
  const set = (field) => (value) => onChange(field, value);
  const setPair = (firstField, secondField) => ([first, second]) => {
    onChange(firstField, first);
    onChange(secondField, second);
  };
  return (
    <div className="rules-section">
      <RuleField title="Mínimo para o pódio" hint="Para quem entra no meio da temporada. De 1 a 4.">
        <RuleSelect
          id="rule-min-podium"
          label="Mínimo para o pódio"
          value={config.minPodiumWeeks}
          options={optionsFor(rangeOf(CONFIG_LIMITS.minPodiumWeeks), config.minPodiumWeeks, podiumLabelOf)}
          onChange={set('minPodiumWeeks')}
        />
      </RuleField>
      <RuleField title="Fechamento da semana" hint={`Fuso ${config.timeZone}. Registros depois ficam no histórico.`}>
        <RuleSelect
          id="rule-close-weekday"
          label="Dia do fechamento"
          value={config.closeWeekday}
          options={WEEKDAY_LABELS.map((label, index) => ({ value: index, label }))}
          onChange={set('closeWeekday')}
        />
        <RuleSelect
          id="rule-close-hour"
          label="Hora do fechamento"
          value={config.closeHour}
          options={rangeOf(CONFIG_LIMITS.closeHour).map((hour) => ({ value: hour, label: hourLabelOf(hour) }))}
          onChange={set('closeHour')}
        />
      </RuleField>
      <RuleField title="Tempo mínimo de treino" hint="Abaixo disso o treino aparece sinalizado. Não tira ponto.">
        <RuleSelect
          id="rule-min-workout"
          label="Tempo mínimo de treino"
          value={config.minWorkoutMinutes}
          options={optionsFor(rangeOf(CONFIG_LIMITS.minWorkoutMinutes, WORKOUT_MINUTES_STEP), config.minWorkoutMinutes, (minutes) => `${minutes} minutos`)}
          onChange={set('minWorkoutMinutes')}
        />
      </RuleField>
      <RuleField title="Alerta de risco" hint="Entra no filtro Em risco e no resumo de segunda.">
        <PairSelect
          id="rule-risk"
          label="Alerta de risco"
          pair={[config.riskLimit, config.riskWeeks]}
          options={pairOptions(rangeOf(CONFIG_LIMITS.riskLimit, RISK_LIMIT_STEP), rangeOf(CONFIG_LIMITS.riskWeeks), [config.riskLimit, config.riskWeeks], riskLabelOf)}
          onChange={setPair('riskLimit', 'riskWeeks')}
        />
      </RuleField>
      <RuleField title="Registro em lote" hint="Antes do fechamento. Só sinaliza para ti.">
        <PairSelect
          id="rule-batch"
          label="Registro em lote"
          pair={[config.batchCount, config.batchMinutes]}
          options={pairOptions(BATCH_COUNT_CHOICES, BATCH_MINUTES_CHOICES, [config.batchCount, config.batchMinutes], batchLabelOf)}
          onChange={setPair('batchCount', 'batchMinutes')}
        />
      </RuleField>
    </div>
  );
};

RulesSection.propTypes = {
  config: PropTypes.shape({
    minPodiumWeeks: PropTypes.number.isRequired,
    closeWeekday: PropTypes.number.isRequired,
    closeHour: PropTypes.number.isRequired,
    timeZone: PropTypes.string.isRequired,
    minWorkoutMinutes: PropTypes.number.isRequired,
    riskLimit: PropTypes.number.isRequired,
    riskWeeks: PropTypes.number.isRequired,
    batchCount: PropTypes.number.isRequired,
    batchMinutes: PropTypes.number.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default RulesSection;
