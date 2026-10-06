import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../i18n';
import { formatMonthLabel, shiftYearMonth } from '../utils/subscriptionHelpers';

/**
 * "‹ outubro de 2026 ›". `max` ("YYYY-MM") disables moving past it — future
 * months are blocked on Financeiro because cycles only exist 7 days ahead.
 */
const MonthSelector = ({ value, onChange, max, disabled = false }) => {
  const atMax = Boolean(max) && value >= max;
  const nextDisabled = disabled || atMax;

  const handleNext = () => {
    if (nextDisabled) return;
    onChange(shiftYearMonth(value, 1));
  };

  return (
    <div className="month-selector" role="group" aria-label={t('finance.month.groupAria')}>
      <button
        type="button"
        className="month-selector-arrow"
        onClick={() => onChange(shiftYearMonth(value, -1))}
        aria-label={t('finance.month.previous')}
        disabled={disabled}
      >
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <span className="month-selector-label" aria-live="polite">{formatMonthLabel(value)}</span>
      <button
        type="button"
        className="month-selector-arrow"
        onClick={handleNext}
        aria-label={t('finance.month.next')}
        aria-disabled={nextDisabled}
        disabled={disabled}
        title={atMax ? t('finance.month.futureBlocked') : undefined}
      >
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

MonthSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  max: PropTypes.string,
  disabled: PropTypes.bool,
};

export default MonthSelector;
