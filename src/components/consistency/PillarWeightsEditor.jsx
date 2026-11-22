import PropTypes from 'prop-types';
import WeightRow from './WeightRow';
import { effectivePercents, effectiveWeightsPhrase, isScoringRuleValid, weightSumOf } from '../../utils/consistencyWeights';
import { PILLAR, PILLAR_ORDER, WEIGHT_TOTAL } from '../../constants/consistencyRanking';

// Sum of the weights as a bar, highlighted when the rule is invalid, with the effective shares and an optional action
const WeightsSummary = ({ weights, activePillars, action }) => {
  const weightSum = weightSumOf(weights);
  const isValid = isScoringRuleValid(weights, activePillars);
  return (
    <div className="weights-summary">
      <div className="weights-summary__head type-body-strong">
        <span>Soma dos pesos</span>
        <span className={isValid ? '' : 'weights-summary__total--invalid'}>{`${weightSum} de ${WEIGHT_TOTAL}`}</span>
      </div>
      <span className="score-bar__track" role="progressbar" aria-label="Soma dos pesos" aria-valuemin={0} aria-valuemax={WEIGHT_TOTAL} aria-valuenow={weightSum}>
        <span className="score-bar__fill" style={{ width: `${Math.min(weightSum, WEIGHT_TOTAL)}%` }} />
      </span>
      <div className="weights-summary__foot type-caption">
        <span>{effectiveWeightsPhrase(weights, activePillars)}</span>
        {action}
      </div>
    </div>
  );
};

WeightsSummary.propTypes = {
  weights: PropTypes.object.isRequired,
  activePillars: PropTypes.arrayOf(PropTypes.string).isRequired,
  action: PropTypes.node,
};

// Five pillars with switch, weight and effective share, and the sum of the weights; disabled locks every control
const PillarWeightsEditor = ({ weights, activePillars, onWeightChange, onActiveChange, disabled = false, summaryAction = null }) => {
  const percents = effectivePercents(weights, activePillars);
  return (
    <fieldset className="pillar-weights-editor" disabled={disabled}>
      <div className="settings-weights">
        {PILLAR_ORDER.map((pillar) => (
          <WeightRow
            key={pillar}
            pillar={pillar}
            weight={weights[pillar]}
            active={activePillars.includes(pillar)}
            effectivePercent={percents[pillar]}
            onWeightChange={onWeightChange}
            onActiveChange={onActiveChange}
          />
        ))}
      </div>
      <WeightsSummary weights={weights} activePillars={activePillars} action={summaryAction} />
    </fieldset>
  );
};

PillarWeightsEditor.propTypes = {
  weights: PropTypes.shape(Object.fromEntries(Object.values(PILLAR).map((pillar) => [pillar, PropTypes.number]))).isRequired,
  activePillars: PropTypes.arrayOf(PropTypes.oneOf(Object.values(PILLAR))).isRequired,
  onWeightChange: PropTypes.func.isRequired,
  onActiveChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  summaryAction: PropTypes.node,
};

export default PillarWeightsEditor;
