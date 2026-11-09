import PropTypes from 'prop-types';
import { formatInteger, formatSigned } from '../../utils/nutritionFormat';

const MINUS = '−';

// Objective adjustment line: "sem ajuste" or "−20% · −383".
const adjustmentText = (panel) => {
  if (Math.round(panel.adjustment) === 0) return 'sem ajuste';
  const percent = Math.round((panel.adjustment / panel.tee) * 100);
  return `${percent < 0 ? MINUS : '+'}${Math.abs(percent)}% · ${formatSigned(panel.adjustment)}`;
};

// One line of the breakdown.
const EnergyRow = ({ label, value }) => (
  <>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </>
);

EnergyRow.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired };

// Dark "GASTO ENERGÉTICO TOTAL" card: TEE, suggested target and the breakdown (BMR, routine, activities, objective).
const EnergyPanel = ({ panel, formulaName, factor }) => {
  if (!panel) {
    return (
      <section className="energy-panel energy-panel--empty" aria-label="Cálculo do gasto energético">
        <p>Sem dados suficientes na ficha para este protocolo.</p>
      </section>
    );
  }
  return (
    <section className="energy-panel" aria-label="Cálculo do gasto energético">
      <div className="energy-panel__totals">
        <div>
          <p className="energy-panel__label">Gasto energético total</p>
          <p className="energy-panel__tee">{formatInteger(panel.tee)} <span>kcal</span></p>
        </div>
        <div className="energy-panel__suggestion">
          <p className="energy-panel__label">Sugestão de meta</p>
          <p className="energy-panel__suggestion-value">{formatInteger(panel.suggestion)} <span>kcal</span></p>
        </div>
      </div>
      <dl className="energy-panel__list">
        <EnergyRow label={`TMB · ${formulaName}`} value={formatInteger(panel.bmr)} />
        <EnergyRow label={`Rotina · fator ${String(factor).replace('.', ',')}`} value={formatInteger(panel.base)} />
        <EnergyRow label="Treinos e atividades" value={formatSigned(panel.activityKcal)} />
        <EnergyRow label="Ajuste do objetivo" value={adjustmentText(panel)} />
      </dl>
    </section>
  );
};

EnergyPanel.propTypes = {
  panel: PropTypes.object,
  formulaName: PropTypes.string.isRequired,
  factor: PropTypes.number.isRequired,
};

export default EnergyPanel;
