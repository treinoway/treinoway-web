import PropTypes from 'prop-types';
import { Info } from 'lucide-react';
import { formatCurrencyBRL } from '../utils/currencyFormat';

const TONE_CLASS = {
  red: 'summary-stat-card summary-stat-card--red',
  amber: 'summary-stat-card summary-stat-card--amber',
  green: 'summary-stat-card summary-stat-card--green',
};

const SummaryStatCard = ({
  label,
  amount,
  studentsCount,
  tone,
  tooltip,
  onClick,
  isActive,
}) => {
  const className = `${TONE_CLASS[tone] || TONE_CLASS.amber}${isActive ? ' summary-stat-card--active' : ''}`;
  const description = studentsCount === 1
    ? '1 aluno'
    : `${studentsCount ?? 0} alunos`;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <div className="summary-stat-card-header">
        <span className="summary-stat-card-label">{label}</span>
        {tooltip && (
          <span className="summary-stat-card-tooltip" title={tooltip} aria-label={tooltip}>
            <Info size={14} strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="summary-stat-card-value">{formatCurrencyBRL(amount)}</div>
      <div className="summary-stat-card-meta">{description}</div>
    </button>
  );
};

SummaryStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  studentsCount: PropTypes.number,
  tone: PropTypes.oneOf(['red', 'amber', 'green']).isRequired,
  tooltip: PropTypes.string,
  onClick: PropTypes.func,
  isActive: PropTypes.bool,
};

export default SummaryStatCard;
