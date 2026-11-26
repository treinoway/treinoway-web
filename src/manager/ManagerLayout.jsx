import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BarChart3, LayoutDashboard, Mail, MessageSquare, Users, UsersRound, Video } from 'lucide-react';
import Badge from '../components/ds/Badge';
import useManagerPendingCounts from '../hooks/useManagerPendingCounts';
import { SIDEBAR_BADGE_MAX } from '../constants/finance';
import { t } from '../i18n';

const USER_PATHS = ['/manager/users', '/manager/protocols', '/manager/sessions'];

const NAV_ITEMS = [
  { id: 'overview', path: '/manager', Icon: LayoutDashboard, matches: ['/manager'], exact: true },
  { id: 'users', path: '/manager/users', Icon: Users, matches: USER_PATHS },
  { id: 'trainers', path: '/manager/trainers', Icon: UsersRound, matches: ['/manager/trainers'] },
  { id: 'invites', path: '/manager/invites', Icon: Mail, matches: ['/manager/invites'], countKey: 'pendingInvites' },
  { id: 'feedbacks', path: '/manager/feedbacks', Icon: MessageSquare, matches: ['/manager/feedbacks'], countKey: 'newFeedbacks' },
  { id: 'aiUsage', path: '/manager/ai-usage', Icon: BarChart3, matches: ['/manager/ai-usage'] },
  { id: 'tutorials', path: '/manager/tutorials', Icon: Video, matches: ['/manager/tutorials'] },
];

// Whether `pathname` is `path` itself or one of its nested routes.
const isWithin = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

// Whether the nav item is the section of the current page (exact for the overview, prefix for the rest).
const isCurrent = (item, pathname) => {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (item.exact) return normalized === item.path;
  return item.matches.some((path) => isWithin(normalized, path));
};

// Count shown on a nav item pill, capped like the app sidebar badges.
const pillText = (count) => (count > SIDEBAR_BADGE_MAX ? `${SIDEBAR_BADGE_MAX}+` : String(count));

// One side-nav entry: icon, label and, when there is something pending, a count pill.
const ManagerNavItem = ({ item, current, count }) => (
  <Link to={item.path} className="nav-item" aria-current={current ? 'page' : undefined}>
    <item.Icon className="nav-item__icon" size={20} strokeWidth={2} aria-hidden="true" />
    <span className="nav-item__label">{t(`manager.nav.${item.id}`)}</span>
    {count > 0 && <Badge tone="brand" variant="tag" className="nav-item__count">{pillText(count)}</Badge>}
  </Link>
);

ManagerNavItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    Icon: PropTypes.elementType.isRequired,
  }).isRequired,
  current: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
};

// Backoffice shell: top bar with the title and a link back to the app, side nav of the sections and the page.
const ManagerLayout = ({ children }) => {
  const { pathname } = useLocation();
  const pending = useManagerPendingCounts(true, pathname);
  return (
    <div className="manager-shell">
      <header className="manager-topbar">
        <span className="manager-topbar__title type-h3">{t('manager.title')}</span>
        <Link to="/" className="btn btn--ghost">
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          {t('manager.backToApp')}
        </Link>
      </header>
      <div className="manager-body">
        <nav className="manager-nav" aria-label={t('manager.nav.label')}>
          <ul className="manager-nav__list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <ManagerNavItem item={item} current={isCurrent(item, pathname)} count={item.countKey ? pending[item.countKey] : 0} />
              </li>
            ))}
          </ul>
        </nav>
        <main className="manager-main">{children}</main>
      </div>
    </div>
  );
};

ManagerLayout.propTypes = { children: PropTypes.node.isRequired };

export default ManagerLayout;
