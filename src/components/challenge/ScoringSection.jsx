import { useState } from 'react';
import PropTypes from 'prop-types';
import PillarWeightsEditor from '../consistency/PillarWeightsEditor';
import { effectiveWeightsPhrase } from '../../utils/consistencyWeights';
import { PILLAR, PILLAR_ORDER } from '../../constants/consistencyRanking';

const SOURCE_LABEL = Object.freeze({ ranking: 'Igual ao ranking geral', default: 'Padrão' });
const CUSTOM_LABEL = 'Personalizada';

// Whether two scoring rules have the same weights and the same active pillars
const sameRule = (left, right) =>
  PILLAR_ORDER.every((pillar) => left.weights[pillar] === right.weights[pillar])
  && left.activePillars.length === right.activePillars.length
  && left.activePillars.every((pillar) => right.activePillars.includes(pillar));

// Scoring of a championship: summary against the general ranking, "Personalizar" with the pillar editor and "Usar a do ranking geral"
const ScoringSection = ({ value, base, onChange, disabled = false }) => {
  const [editing, setEditing] = useState(false);
  const isCustom = !sameRule(value, base);
  const summaryLabel = isCustom ? CUSTOM_LABEL : SOURCE_LABEL[base.source];
  const handleWeightChange = (pillar, weight) => onChange({ ...value, weights: { ...value.weights, [pillar]: weight } });
  const handleActiveChange = (pillar, active) => {
    const others = value.activePillars.filter((item) => item !== pillar);
    onChange({ ...value, activePillars: active ? [...others, pillar] : others });
  };
  const handleUseBase = () => onChange({ weights: { ...base.weights }, activePillars: [...base.activePillars] });

  return (
    <section className="scoring-section" aria-labelledby="scoring-section-title">
      <span className="field-label type-caption-strong" id="scoring-section-title">Pontuação</span>
      <div className="scoring-section__summary">
        <div className="scoring-section__text">
          <span className="type-body-strong">{summaryLabel}</span>
          {!editing && <span className="type-caption scoring-section__shares">{effectiveWeightsPhrase(value.weights, value.activePillars)}</span>}
        </div>
        <div className="scoring-section__actions">
          {isCustom && <button type="button" className="btn btn--ghost" disabled={disabled} onClick={handleUseBase}>Usar a do ranking geral</button>}
          {!editing && <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => setEditing(true)}>Personalizar</button>}
        </div>
      </div>
      {editing && (
        <PillarWeightsEditor
          weights={value.weights}
          activePillars={value.activePillars}
          onWeightChange={handleWeightChange}
          onActiveChange={handleActiveChange}
          disabled={disabled}
        />
      )}
    </section>
  );
};

const weightsPropType = PropTypes.shape(Object.fromEntries(Object.values(PILLAR).map((pillar) => [pillar, PropTypes.number])));

ScoringSection.propTypes = {
  value: PropTypes.shape({
    weights: weightsPropType.isRequired,
    activePillars: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  base: PropTypes.shape({
    weights: weightsPropType.isRequired,
    activePillars: PropTypes.arrayOf(PropTypes.string).isRequired,
    source: PropTypes.oneOf(['ranking', 'default']).isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ScoringSection;
