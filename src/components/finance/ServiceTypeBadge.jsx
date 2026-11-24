import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { t } from '../../i18n';

/** Tag of a plan: Treino / Nutrição / Ambos (API label first, translated type as fallback). */
const ServiceTypeBadge = ({ serviceType, label }) => {
  const text = label || t(`finance.serviceType.${serviceType}`);
  if (!text) return null;
  return <Badge tone="neutral" variant="tag">{text}</Badge>;
};

ServiceTypeBadge.propTypes = {
  serviceType: PropTypes.string,
  label: PropTypes.string,
};

export default ServiceTypeBadge;
