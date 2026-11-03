import PropTypes from 'prop-types';
import Badge from '../../components/ds/Badge';
import { t } from '../../i18n';
import { getRoleLabels } from '../format';

// Badges for a user's roles, plus a "deleted" badge for soft-deleted accounts.
const RoleBadges = ({ roles, isStudent, deletedAt }) => (
  <>
    {getRoleLabels(roles, isStudent).map((label) => (
      <Badge key={label} tone="brand" variant="tag">
        {label}
      </Badge>
    ))}
    {deletedAt && <Badge tone="error">{t('manager.deleted')}</Badge>}
  </>
);

RoleBadges.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  isStudent: PropTypes.bool,
  deletedAt: PropTypes.string,
};

export default RoleBadges;
