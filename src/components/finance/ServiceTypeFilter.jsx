import { useId } from 'react';
import PropTypes from 'prop-types';
import Select from '../Select';
import { t } from '../../i18n';
import { SERVICE_TYPE, SERVICE_TYPE_FILTER_ALL } from '../../constants/finance';

const OPTIONS = [
  { id: SERVICE_TYPE_FILTER_ALL, label: t('finance.serviceType.filterAll') },
  { id: SERVICE_TYPE.TRAINING, label: t('finance.serviceType.training') },
  { id: SERVICE_TYPE.NUTRITION, label: t('finance.serviceType.nutrition') },
  { id: SERVICE_TYPE.BOTH, label: t('finance.serviceType.both') },
];

/** "Tipo" select (Todos / Treino / Nutrição / Ambos) for dual-role users; exact match on the plan tag. */
const ServiceTypeFilter = ({ value, onChange }) => {
  const selectId = useId();
  const label = t('finance.serviceType.filterLabel');
  return (
    <div className="finance-type-filter">
      <label className="finance-type-filter__label type-body" htmlFor={selectId}>{label}</label>
      <Select id={selectId} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </Select>
    </div>
  );
};

ServiceTypeFilter.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ServiceTypeFilter;
