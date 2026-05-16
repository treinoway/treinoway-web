import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthLabel } from '../utils/subscriptionHelpers';

const shiftMonth = (yearMonth, offset) => {
  const [year, month] = yearMonth.split('-').map(Number);
  let newMonth = month + offset;
  let newYear = year;
  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
};

const MonthSelector = ({ value, onChange }) => {
  return (
    <div className="month-selector" role="group" aria-label="Selecionar mês">
      <button
        type="button"
        className="month-selector-arrow"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <span className="month-selector-label">{formatMonthLabel(value)}</span>
      <button
        type="button"
        className="month-selector-arrow"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

MonthSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default MonthSelector;
