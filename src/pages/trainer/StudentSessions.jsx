import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PeriodPickerSheet from '../../components/PeriodPickerSheet';
import SessionsList from '../../components/SessionsList';
import useLinkedStudent from '../../hooks/useLinkedStudent';
import usePeriodPersistence from '../../hooks/usePeriodPersistence';
import useStudentSessions, { SESSIONS_LIST_LIMIT } from '../../hooks/useStudentSessions';
import { DASHBOARD_PERIOD_PRESETS, getPeriodPresetLabel } from '../../constants/dashboardPeriod';
import { formatPeriodRangeShort } from '../../utils/formatDashboardDate';
import { getStudentDisplayName } from '../../utils/studentRow';
import { td } from '../../utils/studentCockpit';

// Period seeded from ?from=&to= (set by the student cockpit), or null to use the persisted one.
const readPeriodOverride = (searchParams) => {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  return from && to ? { presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM, from, to } : null;
};

// Human label of the selected period.
const getPeriodLabel = (period) => (period.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM
  ? formatPeriodRangeShort(period.from, period.to) || td('customPeriod')
  : getPeriodPresetLabel(period.presetKey));

// Trainer view of every session of a student in a period.
const StudentSessions = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [period, setPeriod] = usePeriodPersistence(user?.id, { initialOverride: readPeriodOverride(searchParams) });
  const [pickerOpen, setPickerOpen] = useState(false);

  const { student } = useLinkedStudent(id, null, showToast);
  const { sessions, loading, error, retry } = useStudentSessions(id, period);

  const periodLabel = getPeriodLabel(period);
  const studentName = student ? getStudentDisplayName(student) : null;
  const reachedLimit = sessions.length >= SESSIONS_LIST_LIMIT;

  const handleApplyPeriod = (next) => {
    setPeriod(next);
    setPickerOpen(false);
  };

  const handleOpenSession = (session) => {
    navigate(`/trainer/students/${id}/sessions/${session.id}`, {
      state: { returnTo: `${location.pathname}${location.search}` },
    });
  };

  return (
    <div className="student-sessions">
      <button
        type="button"
        className="btn btn--ghost student-sessions__back"
        onClick={() => navigate(`/trainer/students/${id}`)}
        aria-label={td('sessions.backAria')}
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {studentName ?? td('back')}
      </button>

      <section className="section-card cockpit-card" aria-labelledby="student-sessions-heading">
        <header className="cockpit-card__header">
          <h1 id="student-sessions-heading" className="cockpit-card__title type-h3">{td('sessions.listTitle')}</h1>
          <button
            type="button"
            className="btn btn--secondary"
            aria-haspopup="dialog"
            aria-label={td('periodAria', { period: periodLabel })}
            onClick={() => setPickerOpen(true)}
          >
            <Calendar size={16} strokeWidth={2} aria-hidden="true" />
            {periodLabel}
          </button>
        </header>
        <SessionsList
          sessions={sessions}
          loading={loading}
          error={error}
          onRetry={retry}
          onOpen={handleOpenSession}
        />
        {reachedLimit && (
          <p className="cockpit-card__muted type-caption">{td('sessions.limitNote', { count: SESSIONS_LIST_LIMIT })}</p>
        )}
      </section>

      <PeriodPickerSheet
        open={pickerOpen}
        currentPeriod={period}
        onApply={handleApplyPeriod}
        onCancel={() => setPickerOpen(false)}
      />
    </div>
  );
};

export default StudentSessions;
