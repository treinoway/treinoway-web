import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { t } from '../i18n';

/** Sidebar "Financeiro" entry shared by every professional, with the overdue count badge. */
const FinanceSidebarLink = ({ active, overdueCount, badgeText, ariaLabel }) => (
  <Link
    to="/financeiro"
    className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`}
    aria-label={ariaLabel}
  >
    <span className="sidebar-link-icon" aria-hidden="true">
      <Wallet size={20} strokeWidth={1.6} />
      {overdueCount > 0 && <span className="sidebar-link-dot" />}
    </span>
    <span className="sidebar-link-label">{t('finance.sidebar.label')}</span>
    {overdueCount > 0 && (
      <span className="sidebar-link-badge sidebar-link-badge--count" aria-hidden="true">{badgeText}</span>
    )}
  </Link>
);

FinanceSidebarLink.propTypes = {
  active: PropTypes.bool.isRequired,
  overdueCount: PropTypes.number.isRequired,
  badgeText: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

export default FinanceSidebarLink;
