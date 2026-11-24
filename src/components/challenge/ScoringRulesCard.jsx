import PropTypes from 'prop-types';
import { Lock } from 'lucide-react';
import PillarWeightsEditor from '../consistency/PillarWeightsEditor';
import { CHALLENGE_STATUS } from '../../constants/challenge';

const RUNNING_LOCK_NOTICE = 'Não é possível alterar as regras com o campeonato em andamento.';

// The six XP rules of a championship, labelled as in the design system
const XP_RULES = Object.freeze([
  { key: 'ptsWorkoutCompleted', label: 'Treino concluído', helper: 'Pontos por completar um treino' },
  { key: 'ptsStreak7Days', label: 'Sequência de 7 dias', helper: 'Pontos por manter 7 dias seguidos treinando' },
  { key: 'ptsStreak30Days', label: 'Sequência de 30 dias', helper: 'Pontos por manter 30 dias seguidos treinando' },
  { key: 'ptsDailyCheckin', label: 'Check-in diário', helper: 'Pontos por registrar presença no treino' },
  { key: 'ptsEvolutionRecord', label: 'Registro de evolução', helper: 'Pontos por registrar medidas corporais' },
  { key: 'ptsWorkoutFeedback', label: 'Feedback de treino', helper: 'Pontos por avaliar o treino realizado' },
]);

// Number typed in a rule field: null when emptied
const pointsOf = (text) => (text === '' ? null : Number(text));

// One XP rule: label and helper on the left, the points field on the right
const XpRuleRow = ({ rule, value, onChange }) => {
  const id = `scoring-rule-${rule.key}`;
  return (
    <div className="scoring-rule-row">
      <div className="scoring-rule-row__text">
        <label className="type-body-strong" htmlFor={id}>{rule.label}</label>
        <span className="scoring-rule-row__helper type-caption" id={`${id}-hint`}>{rule.helper}</span>
      </div>
      <input id={id} type="number" min={0} className="input scoring-rule-row__input" aria-describedby={`${id}-hint`} value={value ?? ''} onChange={(event) => onChange(rule.key, pointsOf(event.target.value))} />
    </div>
  );
};

XpRuleRow.propTypes = {
  rule: PropTypes.object.isRequired,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

// Pillar weights of a weekly championship as the editor changes them
const pillarHandlersOf = (rule, onRuleChange) => ({
  onWeightChange: (pillar, weight) => onRuleChange({ ...rule, weights: { ...rule.weights, [pillar]: weight } }),
  onActiveChange: (pillar, active) => {
    const others = rule.activePillars.filter((item) => item !== pillar);
    onRuleChange({ ...rule, activePillars: active ? [...others, pillar] : others });
  },
});

// "Regras de pontuação" card: "Pilares e pesos" (weekly) and the six XP rules, editable only while scheduled, with the lock notice while running
const ScoringRulesCard = ({ status, showPillars = false, rule = null, points, onRuleChange, onPointsChange }) => {
  const locked = status !== CHALLENGE_STATUS.SCHEDULED;
  return (
    <section className="section-card settings-card scoring-rules-card" aria-labelledby="scoring-rules-title">
      <h2 className="type-h3" id="scoring-rules-title">Regras de pontuação</h2>
      {status === CHALLENGE_STATUS.ACTIVE && (
        <div className="ds-banner ds-banner--inline challenge-locked-notice" role="note">
          <span className="ds-banner__icon" aria-hidden="true"><Lock size={20} strokeWidth={2} /></span>
          <p className="ds-banner__text type-body">{RUNNING_LOCK_NOTICE}</p>
        </div>
      )}
      {showPillars && rule && (
        <div className="scoring-rules-card__pillars">
          <h3 className="type-body-strong">Pilares e pesos</h3>
          <PillarWeightsEditor weights={rule.weights} activePillars={rule.activePillars} disabled={locked} {...pillarHandlersOf(rule, onRuleChange)} />
        </div>
      )}
      <fieldset className="scoring-rules-card__xp" disabled={locked}>
        {XP_RULES.map((xpRule) => <XpRuleRow key={xpRule.key} rule={xpRule} value={points[xpRule.key]} onChange={onPointsChange} />)}
      </fieldset>
    </section>
  );
};

ScoringRulesCard.propTypes = {
  status: PropTypes.string.isRequired,
  showPillars: PropTypes.bool,
  rule: PropTypes.shape({
    weights: PropTypes.object.isRequired,
    activePillars: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  points: PropTypes.object.isRequired,
  onRuleChange: PropTypes.func,
  onPointsChange: PropTypes.func.isRequired,
};

export default ScoringRulesCard;
