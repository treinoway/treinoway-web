import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { t } from '../../i18n';
import Banner from '../../components/ds/Banner';
import MetricCard from '../../components/ds/MetricCard';
import Segmented from '../../components/ds/Segmented';
import SkeletonRows from '../../components/ds/SkeletonRows';
import { getUser } from '../api';
import { getDisplayName } from '../format';
import useManagerQuery from '../useManagerQuery';
import RoleBadges from '../components/RoleBadges';
import { StudentsTab, TrainersTab, ProtocolsTab, TemplatesTab, SessionsTab } from '../components/UserTabs';

// Builds the visible tabs: trainer tabs for trainers, student tabs when not a trainer or when linked.
const buildTabs = (overview) => {
  const { counts } = overview;
  const isTrainer = Boolean(overview.trainer);
  const showStudentTabs = !isTrainer || counts.trainers > 0 || counts.protocolsAssigned > 0;
  const tabs = [];
  if (isTrainer) {
    tabs.push(
      { id: 'students', label: t('manager.tabs.students') },
      { id: 'created', label: t('manager.tabs.created') },
      { id: 'templates', label: t('manager.tabs.templates') }
    );
  }
  if (showStudentTabs) {
    tabs.push(
      { id: 'received', label: t('manager.tabs.received') },
      { id: 'trainers', label: t('manager.tabs.trainers') }
    );
  }
  tabs.push({ id: 'sessions', label: t('manager.tabs.sessions') });
  return tabs;
};

// Builds the metric cards relevant to the user's profile.
const buildMetrics = (overview) => {
  const { counts } = overview;
  const sessions = { key: 'sessions', label: t('manager.metrics.workoutSessions'), value: counts.workoutSessions };
  if (!overview.trainer) {
    return [
      { key: 'trainers', label: t('manager.metrics.trainers'), value: counts.trainers },
      { key: 'assigned', label: t('manager.metrics.protocolsAssigned'), value: counts.protocolsAssigned },
      sessions,
    ];
  }
  return [
    { key: 'students', label: t('manager.metrics.students'), value: counts.students },
    { key: 'active', label: t('manager.metrics.activeStudents'), value: counts.activeStudents },
    { key: 'created', label: t('manager.metrics.protocolsCreated'), value: counts.protocolsCreated },
    { key: 'trainingTpl', label: t('manager.metrics.trainingTemplates'), value: counts.trainingTemplates },
    { key: 'exerciseTpl', label: t('manager.metrics.exerciseTemplates'), value: counts.exerciseTemplates },
    { key: 'challenges', label: t('manager.metrics.challenges'), value: counts.challenges },
    sessions,
  ];
};

// Renders the body of the selected tab; only that tab fetches.
const TabContent = ({ tab, userId }) => {
  if (tab === 'students') return <StudentsTab userId={userId} />;
  if (tab === 'created') return <ProtocolsTab userId={userId} as="trainer" />;
  if (tab === 'received') return <ProtocolsTab userId={userId} as="student" />;
  if (tab === 'templates') return <TemplatesTab userId={userId} />;
  if (tab === 'trainers') return <TrainersTab userId={userId} />;
  return <SessionsTab userId={userId} />;
};

TabContent.propTypes = {
  tab: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

// Header with the back button, name, email and role badges.
const UserHeader = ({ overview, onBack }) => (
  <header className="manager-user-header">
    <button type="button" className="btn btn--ghost" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      {t('manager.backToUsers')}
    </button>
    <h1 className="type-h1">{getDisplayName(overview.user)}</h1>
    <p className="type-body">{overview.user.email ?? '—'}</p>
    <div className="manager-badges">
      <RoleBadges
        roles={overview.user.roles}
        isStudent={overview.counts.trainers > 0}
        deletedAt={overview.user.deletedAt}
      />
    </div>
  </header>
);

UserHeader.propTypes = {
  overview: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

// Overview loaded: header, metrics and the lazily-fetched tabs.
const UserOverview = ({ overview, userId }) => {
  const navigate = useNavigate();
  const tabs = buildTabs(overview);
  const [selected, setSelected] = useState(tabs[0].id);

  return (
    <div className="admin-page">
      <UserHeader overview={overview} onBack={() => navigate('/manager')} />
      <div className="metric-grid">
        {buildMetrics(overview).map((metric) => (
          <MetricCard key={metric.key} label={metric.label} value={metric.value} />
        ))}
      </div>
      <Segmented ariaLabel={t('manager.tabsLabel')} items={tabs} value={selected} onChange={setSelected} />
      <TabContent key={selected} tab={selected} userId={userId} />
    </div>
  );
};

UserOverview.propTypes = {
  overview: PropTypes.object.isRequired,
  userId: PropTypes.string.isRequired,
};

// Loads the overview of one user.
const UserDetailView = ({ userId }) => {
  const request = useCallback(() => getUser(userId), [userId]);
  const { data, message, loading } = useManagerQuery(request);

  if (loading) return <SkeletonRows label={t('manager.loadingUser')} count={4} />;
  if (message) return <Banner tone="error">{message}</Banner>;
  return <UserOverview overview={data} userId={userId} />;
};

UserDetailView.propTypes = { userId: PropTypes.string.isRequired };

// Backoffice user detail; keyed by id so navigating between users resets the tabs.
const UserDetail = () => {
  const { userId } = useParams();
  return <UserDetailView key={userId} userId={userId} />;
};

export default UserDetail;
