import PropTypes from 'prop-types';
import Segmented from '../ds/Segmented';
import { t } from '../../i18n';
import { SERVICE_TYPE, SERVICE_TYPE_FILTER_ALL } from '../../constants/finance';

const ITEMS = [
  { id: SERVICE_TYPE_FILTER_ALL, label: t('finance.serviceType.filterAll') },
  { id: SERVICE_TYPE.TRAINING, label: t('finance.serviceType.training') },
  { id: SERVICE_TYPE.NUTRITION, label: t('finance.serviceType.nutrition') },
  { id: SERVICE_TYPE.BOTH, label: t('finance.serviceType.both') },
];

/** Type filter (Todos / Treino / Nutrição / Ambos) for dual-role users; exact match on the plan tag. */
const ServiceTypeFilter = ({ value, onChange }) => (
  <div className="finance-type-filter">
    <Segmented ariaLabel={t('finance.serviceType.filterAria')} items={ITEMS} value={value} onChange={onChange} />
  </div>
);

ServiceTypeFilter.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ServiceTypeFilter;
