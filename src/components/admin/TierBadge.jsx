import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { t } from '../../i18n';

// Returns the badge tone for a platform plan tier (FREE neutral, paid tiers brand).
const getTierTone = (tier) => (tier === 'FREE' ? 'neutral' : 'brand');

// Plan badge using the platformPlan.tier labels.
const TierBadge = ({ tier }) => (
  <Badge tone={getTierTone(tier)} variant="tag">{t(`platformPlan.tier.${tier}`) || tier}</Badge>
);

TierBadge.propTypes = { tier: PropTypes.string.isRequired };

export default TierBadge;
