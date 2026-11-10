import PropTypes from 'prop-types';
import { ClipboardCheck, Droplet, HeartPulse, MessageSquare, Utensils } from 'lucide-react';
import Toggle from '../ds/Toggle';
import { PILLAR, PILLAR_LABELS } from '../../constants/consistencyRanking';

const MAX_WEIGHT = 100;
const OFF_LABEL = 'fora';
const DIET_OFF_NOTE = 'Ligue quando tua consultoria passar dieta. Hoje o peso dela se redistribui.';

const PILLAR_ICONS = Object.freeze({
  [PILLAR.WORKOUTS]: ClipboardCheck,
  [PILLAR.CARDIO]: HeartPulse,
  [PILLAR.FEEDBACK]: MessageSquare,
  [PILLAR.HYDRATION]: Droplet,
  [PILLAR.DIET]: Utensils,
});

const PILLAR_DESCRIPTIONS = Object.freeze({
  [PILLAR.WORKOUTS]: 'Treino do plano marcado como concluído',
  [PILLAR.CARDIO]: 'Sessão de cardio prescrita concluída',
  [PILLAR.FEEDBACK]: 'Check-in agendado enviado',
  [PILLAR.HYDRATION]: 'Dia em que bateu a meta de água',
  [PILLAR.DIET]: 'Refeição do plano marcada no app',
});

// Weight typed or dragged, as a whole number kept between 0 and 100; an empty field counts as 0
const clampWeight = (raw) => {
  const value = Math.trunc(Number(raw));
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), MAX_WEIGHT);
};

// Effective share as "42,9%", or "fora" when the pillar is off
const effectiveLabelOf = (effectivePercent) => {
  if (effectivePercent === null || effectivePercent === undefined) return OFF_LABEL;
  return `${effectivePercent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

// One pillar of the scoring: icon, description, slider, number, effective weight and the on/off switch
const WeightRow = ({ pillar, weight, active, effectivePercent, onWeightChange, onActiveChange }) => {
  const label = PILLAR_LABELS[pillar];
  const Icon = PILLAR_ICONS[pillar];
  const showDietNote = pillar === PILLAR.DIET && !active;
  const handleChange = (event) => onWeightChange(pillar, clampWeight(event.target.value));
  return (
    <div className={`weight-row${active ? '' : ' weight-row--off'}`}>
      <span className="weight-row__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="weight-row__identity">
        <span className="type-body-strong">{label}</span>
        <span className="type-caption weight-row__description">{PILLAR_DESCRIPTIONS[pillar]}</span>
        {showDietNote && <span className="type-caption weight-row__note">{DIET_OFF_NOTE}</span>}
      </div>
      <input
        type="range"
        className="weight-row__slider"
        min={0}
        max={MAX_WEIGHT}
        step={1}
        value={weight}
        disabled={!active}
        aria-label={`Peso de ${label}`}
        onChange={handleChange}
      />
      <input
        type="number"
        className="input weight-row__number"
        min={0}
        max={MAX_WEIGHT}
        value={weight}
        disabled={!active}
        aria-label={`Valor do peso de ${label}`}
        onChange={handleChange}
      />
      <span className="weight-row__effective type-body-strong">{effectiveLabelOf(active ? effectivePercent : null)}</span>
      <Toggle checked={active} label={`Incluir ${label} no ranking`} onChange={(next) => onActiveChange(pillar, next)} />
    </div>
  );
};

WeightRow.propTypes = {
  pillar: PropTypes.oneOf(Object.values(PILLAR)).isRequired,
  weight: PropTypes.number.isRequired,
  active: PropTypes.bool.isRequired,
  effectivePercent: PropTypes.number,
  onWeightChange: PropTypes.func.isRequired,
  onActiveChange: PropTypes.func.isRequired,
};

export default WeightRow;
