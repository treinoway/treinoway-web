import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronDown, UserX } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import Modal from '../../components/ds/Modal';
import EmptyBlock from '../../components/ds/EmptyBlock';
import StudentCockpitHero from '../../components/StudentCockpitHero';
import StudentRelationshipMetrics from '../../components/students/StudentRelationshipMetrics';
import StudentRoutinesCard from '../../components/students/StudentRoutinesCard';
import StudentAnamnesesCard from '../../components/students/StudentAnamnesesCard';
import StudentVolumeCard from '../../components/students/StudentVolumeCard';
import StudentLatestNoteCard from '../../components/students/StudentLatestNoteCard';
import RecentSessionsPanel from '../../components/RecentSessionsPanel';
import ProgressionPanel from '../../components/ProgressionPanel';
import PeriodPickerSheet from '../../components/PeriodPickerSheet';
import IArnoldFAB from '../../components/IArnoldFAB';
import StudentSubscriptionSection from '../../components/finance/StudentSubscriptionSection';
import useStudentDashboard from '../../hooks/useStudentDashboard';
import useStudentSubscriptionManager from '../../hooks/useStudentSubscriptionManager';
import useLinkedStudent from '../../hooks/useLinkedStudent';
import usePeriodPersistence from '../../hooks/usePeriodPersistence';
import { DASHBOARD_PERIOD_PRESETS, getPeriodPresetLabel } from '../../constants/dashboardPeriod';
import { pickViz } from '../../constants/dashboardViz';
import { formatPeriodRangeShort } from '../../utils/formatDashboardDate';
import { computeVolumeTimeline, computeHeatmapWeeks } from '../../utils/computeDailyActivityViz';
import { getStudentDisplayName } from '../../utils/studentRow';
import { findLatestNoteSession, sortProtocolsForDisplay, td } from '../../utils/studentCockpit';
import { ANAMNESIS_FILL_TOAST_DURATION_MS, getAnamnesisFillPath } from '../../constants/anamnesis';

const COMPLETION_WARN_THRESHOLD = 0.5;
const LINK_FORM_ID = 'link-anamnesis-form';

const computePeriodDays = (period) => {
  if (!period?.from || !period?.to) return 30;
  const ms = new Date(period.to).getTime() - new Date(period.from).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};

const buildVizData = (rawDays, period) => {
  const type = pickViz(computePeriodDays(period));
  if (!rawDays) return { type, days: [] };
  if (type === 'heatmap') return { type, ...computeHeatmapWeeks(rawDays) };
  return { type, ...computeVolumeTimeline(rawDays, period) };
};

const getPeriodLabel = (period) => (period.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM
  ? formatPeriodRangeShort(period.from, period.to) || td('customPeriod')
  : getPeriodPresetLabel(period.presetKey));

const buildPeriodQuery = (period) => {
  const params = new URLSearchParams();
  if (period.from) params.set('from', period.from);
  if (period.to) params.set('to', period.to);
  return params.toString();
};

const LinkAnamnesisModal = ({ anamneses, selectedId, linking, onSelect, onSubmit, onClose }) => (
  <Modal
    title={td('linkAnamnesis.title')}
    onClose={onClose}
    closeDisabled={linking}
    footer={(
      <>
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={linking}>
          {td('linkAnamnesis.cancel')}
        </button>
        <button type="submit" form={LINK_FORM_ID} className="btn btn--primary" disabled={linking || !selectedId}>
          {linking ? td('linkAnamnesis.loading') : td('linkAnamnesis.submit')}
        </button>
      </>
    )}
  >
    <form id={LINK_FORM_ID} onSubmit={onSubmit} className="field">
      <label className="field-label type-caption-strong" htmlFor="anamnesis-select">{td('linkAnamnesis.label')}</label>
      <Select
        id="anamnesis-select"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        required
        disabled={linking}
      >
        <option value="">{td('linkAnamnesis.placeholder')}</option>
        {anamneses.map((anamnesis) => (
          <option key={anamnesis.id} value={anamnesis.id}>
            {anamnesis.title}{anamnesis.isGeneral ? td('linkAnamnesis.generalSuffix') : ''}
          </option>
        ))}
      </Select>
    </form>
  </Modal>
);

LinkAnamnesisModal.propTypes = {
  anamneses: PropTypes.array.isRequired,
  selectedId: PropTypes.string.isRequired,
  linking: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const PeriodButton = ({ label, onClick }) => (
  <button
    type="button"
    className="btn btn--secondary"
    onClick={onClick}
    aria-haspopup="dialog"
    aria-label={td('periodAria', { period: label })}
  >
    <Calendar size={16} strokeWidth={2} aria-hidden="true" />
    {label}
    <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
  </button>
);

PeriodButton.propTypes = { label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired };

const StudentNotFound = ({ onBack }) => (
  <EmptyBlock icon={UserX} title={td('notFound')} actionLabel={td('backToStudents')} onAction={onBack} />
);

StudentNotFound.propTypes = { onBack: PropTypes.func.isRequired };

const EMPTY_LIST = [];

const requestProtocols = (studentId) => api.get('/trainer/protocols', { params: { assigneeId: studentId } });
const requestAnamneses = (studentId) => api.get(`/trainer/students/${studentId}/anamneses`);

/**
 * One list owned by the student of the route. Data is keyed by id: until the current id has
 * answered it reads as loading/empty, and a late response (or error) for a previous id is ignored.
 * A refetch keeps showing the current list until the new one arrives.
 */
const useStudentResource = (id, request, showToast) => {
  const [state, setState] = useState({ id: null, data: EMPTY_LIST });
  const currentIdRef = useRef(id);

  useEffect(() => {
    currentIdRef.current = id;
  }, [id]);

  const fetchResource = useCallback(() => {
    const isStale = () => currentIdRef.current !== id;
    return request(id)
      .then((response) => {
        if (!isStale()) setState({ id, data: response.data });
      })
      .catch((err) => {
        if (isStale()) return;
        setState({ id, data: EMPTY_LIST });
        showToast(err.userMessage || translateError(err), 'error');
      });
  }, [id, request, showToast]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  const isCurrent = state.id === id;
  return { data: isCurrent ? state.data : EMPTY_LIST, loading: !isCurrent, refetch: fetchResource };
};

const useStudentRecords = (id, showToast) => {
  const protocols = useStudentResource(id, requestProtocols, showToast);
  const anamneses = useStudentResource(id, requestAnamneses, showToast);
  return {
    protocols: protocols.data,
    protocolsLoading: protocols.loading,
    anamneses: anamneses.data,
    anamnesesLoading: anamneses.loading,
    fetchAnamneses: anamneses.refetch,
  };
};

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { sendMessage } = useAiChat();

  const [period, setPeriod] = usePeriodPersistence(user?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [allAnamneses, setAllAnamneses] = useState([]);
  const [selectedAnamnesisId, setSelectedAnamnesisId] = useState('');
  const [linking, setLinking] = useState(false);
  const [iArnoldSubmitting, setIArnoldSubmitting] = useState(false);

  const { student, notFound: studentNotLinked } = useLinkedStudent(id, location.state?.student ?? null, showToast);
  const studentName = student ? getStudentDisplayName(student) : null;
  const dashboard = useStudentDashboard(id, period);
  const subscription = useStudentSubscriptionManager(id, studentName);
  const records = useStudentRecords(id, showToast);

  const summary = dashboard.summary.data;
  const recentSessions = dashboard.recentSessions.data?.data ?? [];
  const progressionEntries = useMemo(() => dashboard.progression.data?.data ?? [], [dashboard.progression.data]);
  const dailyActivityRaw = dashboard.dailyActivity.data?.data ?? null;
  const vizData = useMemo(() => buildVizData(dailyActivityRaw, period), [dailyActivityRaw, period]);
  const sortedProtocols = useMemo(() => sortProtocolsForDisplay(records.protocols), [records.protocols]);
  const activeProtocol = sortedProtocols.find((protocol) => protocol.status === 'active') ?? null;
  const latestNoteSession = findLatestNoteSession(recentSessions);
  const trainerName = user ? getStudentDisplayName(user) || null : null;
  const periodLabel = getPeriodLabel(period);
  const completionRate = summary?.completionRate ?? null;

  const handleApplyPeriod = (next) => {
    setPeriod(next);
    setPickerOpen(false);
  };

  const handleOpenLinkForm = useCallback(async () => {
    setShowLinkForm(true);
    try {
      const response = await api.get('/trainer/anamneses');
      setAllAnamneses(response.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [showToast]);

  const handleCloseLinkForm = () => {
    setShowLinkForm(false);
    setSelectedAnamnesisId('');
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!selectedAnamnesisId) return;
    setLinking(true);
    try {
      await api.post(`/trainer/students/${id}/anamneses`, { anamnesisId: selectedAnamnesisId });
      showToast(td('linkAnamnesis.success'), 'success', {
        actionLabel: td('linkAnamnesis.fillNow'),
        onAction: () => navigate(getAnamnesisFillPath(id, selectedAnamnesisId)),
        duration: ANAMNESIS_FILL_TOAST_DURATION_MS,
      });
      handleCloseLinkForm();
      records.fetchAnamneses();
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleAskIArnold = async () => {
    if (iArnoldSubmitting) return;
    setIArnoldSubmitting(true);
    try {
      navigate('/trainer/ai-assistant');
      await sendMessage(td('iArnoldPrompt', { name: studentName || td('iArnoldFallbackName') }));
    } catch (err) {
      console.error('[Cockpit] iArnold prefill failed', translateError(err));
    } finally {
      setIArnoldSubmitting(false);
    }
  };

  const handleViewSubscriptionHistory = () => {
    navigate(`/trainer/students/${id}/subscription-history`, { state: { studentName } });
  };

  const activePlanName = subscription.subscription ? subscription.planName : undefined;
  const subscriptionActions = {
    onAssignPlan: subscription.openAssign,
    onReplacePlan: subscription.openReplace,
    onViewHistory: handleViewSubscriptionHistory,
    onCancelSubscription: subscription.requestCancel,
  };

  const handleCreateProtocol = () => navigate(`/trainer/protocols/new?studentId=${id}`);
  const handleBack = () => navigate('/trainer/students');

  if (dashboard.studentNotFound || studentNotLinked) return <StudentNotFound onBack={handleBack} />;

  return (
    <div className="student-detail">
      <button type="button" className="btn btn--ghost student-detail__back" onClick={handleBack} aria-label={td('backAria')}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {td('back')}
      </button>

      <StudentCockpitHero
        student={student}
        routineName={activeProtocol?.name}
        planName={activePlanName}
        trainerName={trainerName ?? undefined}
      />

      <StudentRelationshipMetrics
        summary={summary}
        summaryLoading={dashboard.summary.loading && !summary}
        subscription={subscription.subscription}
        nextPayment={subscription.currentCharge}
        planName={activePlanName}
        subscriptionLoading={subscription.loading}
        lastWorkoutAt={student?.lastWorkoutAt ?? undefined}
        subscriptionActions={subscriptionActions}
      />

      <StudentSubscriptionSection manager={subscription} onViewHistory={handleViewSubscriptionHistory} />

      <section className="student-detail__section" aria-labelledby="student-diagnosis-heading">
        <h2 id="student-diagnosis-heading" className="student-detail__section-title type-body-lg-strong">
          {td('sections.diagnosis')}
        </h2>
        <div className="student-detail__grid">
          <StudentRoutinesCard
            protocols={sortedProtocols}
            loading={records.protocolsLoading}
            onOpen={(protocol) => navigate(`/trainer/protocols/${protocol.id}`)}
            onCreate={handleCreateProtocol}
            onViewAll={() => navigate(`/trainer/students/${id}/protocols`)}
          />
          <StudentAnamnesesCard
            anamneses={records.anamneses}
            loading={records.anamnesesLoading}
            onViewAll={() => navigate(`/trainer/students/${id}/anamneses`)}
            onLink={handleOpenLinkForm}
            onFill={(link) => navigate(getAnamnesisFillPath(id, link.anamnesis.id))}
            onViewResponses={(link) => navigate(`/trainer/students/${id}/anamneses/${link.anamnesis.id}/response`)}
          />
        </div>
      </section>

      <section className="student-detail__section" aria-labelledby="student-training-heading">
        <div className="student-detail__section-header">
          <h2 id="student-training-heading" className="student-detail__section-title type-body-lg-strong">
            {td('sections.training')}
          </h2>
          <PeriodButton label={periodLabel} onClick={() => setPickerOpen(true)} />
        </div>
        <div className={`student-detail__grid student-detail__grid--chart${latestNoteSession ? '' : ' student-detail__grid--single'}`}>
          <StudentVolumeCard
            vizData={vizData}
            periodLabel={periodLabel}
            loading={dashboard.dailyActivity.loading && !dailyActivityRaw}
            error={dashboard.dailyActivity.error}
            onRetry={() => dashboard.retryBlock('dailyActivity')}
          />
          <StudentLatestNoteCard session={latestNoteSession} studentName={studentName ?? undefined} />
        </div>
        <div className="student-detail__grid">
          <RecentSessionsPanel
            sessions={recentSessions}
            loading={dashboard.recentSessions.loading}
            error={dashboard.recentSessions.error}
            onViewAll={() => navigate(`/trainer/students/${id}/sessions?${buildPeriodQuery(period)}`)}
            onRetry={() => dashboard.retryBlock('recentSessions')}
            onOpen={(session) => navigate(`/trainer/students/${id}/sessions/${session.id}`)}
          />
          <ProgressionPanel
            entries={progressionEntries}
            loading={dashboard.progression.loading}
            error={dashboard.progression.error}
            onRetry={() => dashboard.retryBlock('progression')}
            onOpenEntry={(entry) => navigate(`/trainer/students/${id}/exercises/${entry.exerciseId}/progression?${buildPeriodQuery(period)}`)}
          />
        </div>
      </section>

      <IArnoldFAB
        emphasized={completionRate !== null && completionRate < COMPLETION_WARN_THRESHOLD}
        label={td('askIArnold')}
        onClick={handleAskIArnold}
        disabled={iArnoldSubmitting}
      />

      <PeriodPickerSheet
        open={pickerOpen}
        currentPeriod={period}
        onApply={handleApplyPeriod}
        onCancel={() => setPickerOpen(false)}
      />

      {showLinkForm && (
        <LinkAnamnesisModal
          anamneses={allAnamneses}
          selectedId={selectedAnamnesisId}
          linking={linking}
          onSelect={setSelectedAnamnesisId}
          onSubmit={handleLink}
          onClose={handleCloseLinkForm}
        />
      )}
    </div>
  );
};

export default StudentDetail;
