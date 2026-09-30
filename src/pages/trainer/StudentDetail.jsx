import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, ClipboardList, FileText, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import StudentCockpitHero from '../../components/StudentCockpitHero';
import RecentSessionsPanel from '../../components/RecentSessionsPanel';
import ProgressionPanel from '../../components/ProgressionPanel';
import PeriodPickerSheet from '../../components/PeriodPickerSheet';
import IArnoldFAB from '../../components/IArnoldFAB';
import SubscriptionCard from '../../components/SubscriptionCard';
import AssignPlanSheet from '../../components/AssignPlanSheet';
import {
  getActiveSubscriptionForStudent,
  listPaymentsForSubscription,
  listSubscriptionPlans,
  assignPlanToStudent,
  cancelSubscription,
  createSubscriptionPlan,
} from '../../api/subscriptions';
import { deriveEffectivePaymentStatus, PAYMENT_STATUS } from '../../utils/subscriptionHelpers';
import useStudentDashboard from '../../hooks/useStudentDashboard';
import usePeriodPersistence from '../../hooks/usePeriodPersistence';
import {
  DASHBOARD_PERIOD_PRESETS,
  getPeriodPresetLabel,
} from '../../constants/dashboardPeriod';
import { pickViz } from '../../constants/dashboardViz';
import { formatPeriodRangeShort } from '../../utils/formatDashboardDate';
import {
  computeWaveformBars,
  computeHeatmapWeeks,
} from '../../utils/computeDailyActivityViz';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { ANAMNESIS_FILL_TOAST_DURATION_MS, getAnamnesisFillPath } from '../../constants/anamnesis';
import { getStatusLabel, getStatusBadgeClass } from '../../constants/protocolStatus';

const COMPLETION_WARN_THRESHOLD = 0.5;

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return null;
};

const computePeriodDays = (period) => {
  if (!period?.from || !period?.to) return 30;
  const ms = new Date(period.to).getTime() - new Date(period.from).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { sendMessage } = useAiChat();

  // Student profile
  const stateStudent = location.state?.student ?? null;
  const [student, setStudent] = useState(stateStudent);

  // Period + dashboard
  const [period, setPeriod] = usePeriodPersistence(user?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  // Anamneses link modal
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [allAnamneses, setAllAnamneses] = useState([]);
  const [selectedAnamnesisId, setSelectedAnamnesisId] = useState('');
  const [linking, setLinking] = useState(false);

  // Protocols (summary section)
  const [protocols, setProtocols] = useState([]);
  const [protocolsLoading, setProtocolsLoading] = useState(true);

  // Anamneses (summary section)
  const [linkedAnamneses, setLinkedAnamneses] = useState([]);
  const [anamnesisLoading, setAnamnesisLoading] = useState(true);

  // iArnold
  const [iArnoldSubmitting, setIArnoldSubmitting] = useState(false);

  // Subscription
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [nextPayment, setNextPayment] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [assignSheet, setAssignSheet] = useState({ open: false, mode: 'assign' });
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const dashboard = useStudentDashboard(id, period);

  const summary = dashboard.summary.data;
  const previousSummary = dashboard.previousSummary.data;
  const recentSessionsData = dashboard.recentSessions.data;
  const progressionData = dashboard.progression.data;
  const dailyActivityData = dashboard.dailyActivity.data;

  const summaryLoading = dashboard.summary.loading;
  const recentSessionsLoading = dashboard.recentSessions.loading;
  const recentSessionsError = dashboard.recentSessions.error;
  const progressionLoading = dashboard.progression.loading;
  const progressionError = dashboard.progression.error;

  const recentSessions = recentSessionsData?.data ?? [];
  const progressionEntries = useMemo(
    () => progressionData?.data ?? [],
    [progressionData],
  );

  const periodLabel =
    period.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM
      ? formatPeriodRangeShort(period.from, period.to) || 'Período personalizado'
      : getPeriodPresetLabel(period.presetKey);

  const vizData = useMemo(() => {
    const raw = dailyActivityData?.data ?? null;
    const periodDays = computePeriodDays(period);
    const vizType = pickViz(periodDays);
    if (!raw) return { type: vizType, bars: [] };
    if (vizType === 'heatmap') {
      const { weeks, maxVolumeKg, dowLabels } = computeHeatmapWeeks(raw);
      return { type: 'heatmap', weeks, maxVolumeKg, dowLabels };
    }
    const { bars } = computeWaveformBars(raw);
    return { type: 'waveform', bars };
  }, [dailyActivityData, period]);

  const completionRate = summary?.completionRate ?? null;

  // Load student profile if not in router state
  useEffect(() => {
    if (stateStudent) return;
    api.get('/trainer/students')
      .then((r) => setStudent(r.data.find((s) => String(s.id) === String(id)) ?? null))
      .catch((err) => showToast(err.userMessage || translateError(err), 'error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProtocols = useCallback(async () => {
    setProtocolsLoading(true);
    try {
      const r = await api.get('/trainer/protocols', { params: { assigneeId: id } });
      setProtocols(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setProtocolsLoading(false);
    }
  }, [id, showToast]);

  const fetchLinkedAnamneses = useCallback(async () => {
    setAnamnesisLoading(true);
    try {
      const r = await api.get(`/trainer/students/${id}/anamneses`);
      setLinkedAnamneses(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setAnamnesisLoading(false);
    }
  }, [id, showToast]);

  const fetchSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    try {
      const subscription = await getActiveSubscriptionForStudent(id);
      setActiveSubscription(subscription);
      if (subscription) {
        const payments = await listPaymentsForSubscription(subscription.id);
        // pick the most recent pending/overdue, fallback to most recent.
        const sorted = [...payments].sort((a, b) => (b.cycleStartDate || '').localeCompare(a.cycleStartDate || ''));
        const pendingOrOverdue = sorted.find((p) => {
          const status = deriveEffectivePaymentStatus(p);
          return status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.OVERDUE;
        });
        setNextPayment(pendingOrOverdue || sorted[0] || null);
      } else {
        setNextPayment(null);
      }
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setSubscriptionLoading(false);
    }
  }, [id, showToast]);

  const fetchAvailablePlans = useCallback(async () => {
    try {
      const data = await listSubscriptionPlans();
      setAvailablePlans(data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchProtocols();
    fetchLinkedAnamneses();
    fetchSubscription();
    fetchAvailablePlans();
  }, [fetchProtocols, fetchLinkedAnamneses, fetchSubscription, fetchAvailablePlans]);

  const handleApplyPeriod = (next) => {
    setPickerError(null);
    setPeriod(next);
    setPickerOpen(false);
  };

  const handleViewAllSessions = () => {
    const params = new URLSearchParams();
    if (period.from) params.set('from', period.from);
    if (period.to) params.set('to', period.to);
    navigate(`/trainer/students/${id}/sessions?${params.toString()}`);
  };

  const handleOpenSession = (session) => {
    navigate(`/trainer/students/${id}/sessions/${session.id}`);
  };

  const handleOpenProgression = (entry) => {
    const params = new URLSearchParams();
    if (period.from) params.set('from', period.from);
    if (period.to) params.set('to', period.to);
    navigate(
      `/trainer/students/${id}/exercises/${entry.exerciseId}/progression?${params.toString()}`,
    );
  };

  const handleCreateProtocol = () => {
    navigate(`/trainer/protocols/new?studentId=${id}`);
  };

  const handleOpenLinkForm = useCallback(async () => {
    setShowLinkForm(true);
    try {
      const r = await api.get('/trainer/anamneses');
      setAllAnamneses(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [showToast]);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!selectedAnamnesisId) return;
    setLinking(true);
    try {
      await api.post(`/trainer/students/${id}/anamneses`, { anamnesisId: selectedAnamnesisId });
      showToast('Anamnese vinculada com sucesso!', 'success', {
        actionLabel: 'Preencher agora',
        onAction: () => navigate(getAnamnesisFillPath(id, selectedAnamnesisId)),
        duration: ANAMNESIS_FILL_TOAST_DURATION_MS,
      });
      setShowLinkForm(false);
      setSelectedAnamnesisId('');
      fetchLinkedAnamneses();
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleAssignPlan = async (payload) => {
    const created = await assignPlanToStudent(id, payload);
    showToast('Plano atribuído.', 'success');
    setAssignSheet({ open: false, mode: 'assign' });
    setActiveSubscription(created);
    setNextPayment(created?.firstPayment || null);
  };

  const handleReplacePlan = async (payload) => {
    if (activeSubscription) {
      await cancelSubscription(activeSubscription.id);
    }
    await handleAssignPlan(payload);
  };

  const handleQuickCreateAndAssign = async ({ planPayload, assignPayload }) => {
    const createdPlan = await createSubscriptionPlan(planPayload);
    setAvailablePlans((prev) => [...prev, createdPlan]);
    await handleAssignPlan({ ...assignPayload, planId: createdPlan.id });
  };

  const handleCancelSubscription = async () => {
    setCancelConfirm(false);
    try {
      if (activeSubscription) await cancelSubscription(activeSubscription.id);
      showToast('Assinatura cancelada.', 'success');
      setActiveSubscription(null);
      setNextPayment(null);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  };

  const handleViewSubscriptionHistory = () => {
    navigate(`/trainer/students/${id}/subscription-history`);
  };

  const handleAskIArnold = useCallback(async () => {
    if (iArnoldSubmitting) return;
    setIArnoldSubmitting(true);
    const target = getStudentName(student) ?? 'esse aluno';
    try {
      navigate('/trainer/ai-assistant');
      await sendMessage(`Como posso ajudar com ${target}?`);
    } catch (err) {
      console.error('[Cockpit] iArnold prefill failed', translateError(err));
    } finally {
      setIArnoldSubmitting(false);
    }
  }, [iArnoldSubmitting, navigate, sendMessage, student]);

  const allProtocols = useMemo(() => {
    const sorted = [...protocols].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return new Date(b.startDate) - new Date(a.startDate);
    });
    return sorted;
  }, [protocols]);

  if (dashboard.studentNotFound) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Aluno não encontrado</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/trainer/students')}
        >
          Voltar para alunos
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate('/trainer/students')}
        aria-label="Voltar para alunos"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Alunos
      </button>

      <StudentCockpitHero
        student={student}
        summary={summary}
        previousSummary={previousSummary}
        summaryLoading={summaryLoading}
        period={period}
        periodLabel={periodLabel}
        vizData={vizData}
        onPeriodClick={() => setPickerOpen(true)}
        onCreateProtocol={handleCreateProtocol}
        onLinkAnamnesis={handleOpenLinkForm}
      />

      <div className="cockpit-grid-2col">
        <RecentSessionsPanel
          sessions={recentSessions}
          loading={recentSessionsLoading}
          error={recentSessionsError}
          onViewAll={handleViewAllSessions}
          onRetry={() => dashboard.retryBlock('recentSessions')}
          onOpen={handleOpenSession}
        />
        <ProgressionPanel
          entries={progressionEntries}
          loading={progressionLoading}
          error={progressionError}
          onRetry={() => dashboard.retryBlock('progression')}
          onOpenEntry={handleOpenProgression}
        />
      </div>

      <div className="cockpit-section">
        <header className="cockpit-section-header">
          <h2 className="cockpit-section-eyebrow">Assinatura</h2>
        </header>
        <SubscriptionCard
          subscription={activeSubscription ? {
            ...activeSubscription,
            planName: availablePlans.find((p) => p.id === activeSubscription.planId)?.name,
          } : null}
          nextPayment={nextPayment}
          loading={subscriptionLoading}
          onAssign={() => setAssignSheet({ open: true, mode: 'assign' })}
          onReplace={() => setAssignSheet({ open: true, mode: 'replace' })}
          onCancel={() => setCancelConfirm(true)}
          onViewHistory={handleViewSubscriptionHistory}
        />
      </div>

      <RoutineHistorySection
        protocols={allProtocols}
        loading={protocolsLoading}
        studentId={id}
        onCreateProtocol={handleCreateProtocol}
      />

      <AnamneseSummarySection
        anamneses={linkedAnamneses}
        loading={anamnesisLoading}
        studentId={id}
        onLinkAnamnesis={handleOpenLinkForm}
      />

      <IArnoldFAB
        emphasized={completionRate !== null && completionRate < COMPLETION_WARN_THRESHOLD}
        label="Perguntar ao iArnold"
        onClick={handleAskIArnold}
        disabled={iArnoldSubmitting}
      />

      <PeriodPickerSheet
        open={pickerOpen}
        currentPeriod={period}
        onApply={handleApplyPeriod}
        onCancel={() => { setPickerError(null); setPickerOpen(false); }}
        errorMessage={pickerError}
      />

      <AssignPlanSheet
        open={assignSheet.open}
        mode={assignSheet.mode}
        plans={availablePlans.filter((p) => !p.isArchived)}
        onClose={() => setAssignSheet({ open: false, mode: 'assign' })}
        onAssign={assignSheet.mode === 'replace' ? handleReplacePlan : handleAssignPlan}
        onCreatePlanAndAssign={handleQuickCreateAndAssign}
      />

      {cancelConfirm && (
        <div className="overlay" onClick={() => setCancelConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">
              Cancelar a assinatura deste aluno? Ciclos futuros não serão gerados. O histórico será preservado.
            </p>
            <div className="btn-group confirm-dialog-actions">
              <button type="button" className="btn-danger" onClick={handleCancelSubscription}>
                Cancelar assinatura
              </button>
              <button type="button" className="btn-secondary" onClick={() => setCancelConfirm(false)}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="overlay" onClick={() => setShowLinkForm(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Vincular Anamnese</h2>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="bottom-sheet-close"
                aria-label="Fechar"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleLink} className="form">
                <div className="form-group">
                  <label className="form-label" htmlFor="anamnesis-select">
                    Selecionar anamnese
                  </label>
                  <Select
                    id="anamnesis-select"
                    value={selectedAnamnesisId}
                    onChange={(e) => setSelectedAnamnesisId(e.target.value)}
                    required
                    disabled={linking}
                  >
                    <option value="">Selecione uma anamnese...</option>
                    {allAnamneses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}{a.isGeneral ? ' (Geral)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="btn-group btn-group--equal">
                  <button
                    type="submit"
                    disabled={linking || !selectedAnamnesisId}
                    className="btn-primary"
                  >
                    {linking ? 'Vinculando...' : 'Vincular'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Routine history section ---
const RoutineHistorySection = ({ protocols, loading, studentId, onCreateProtocol }) => {
  const navigate = useNavigate();

  if (loading) return null;

  return (
    <div className="cockpit-section">
      <header className="cockpit-section-header">
        <h2 className="cockpit-section-eyebrow">Rotinas</h2>
        <button
          type="button"
          className="cockpit-section-link"
          onClick={() => navigate(`/trainer/students/${studentId}/protocols`)}
          aria-label="Ver todas as rotinas"
        >
          Ver todas
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {protocols.length === 0 ? (
        <div className="cockpit-empty-inline">
          <div className="cockpit-empty-inline-icon" aria-hidden="true">
            <FileText size={20} strokeWidth={2} />
          </div>
          <div className="cockpit-empty-inline-text">
            <p className="cockpit-empty-inline-title">Sem rotinas ainda</p>
            <p className="cockpit-empty-inline-desc">Crie a primeira para este aluno.</p>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onCreateProtocol}
          >
            Nova rotina
          </button>
        </div>
      ) : (
        protocols.slice(0, 4).map((protocol) => (
          <div
            key={protocol.id}
            className={`cockpit-routine-card${protocol.status === 'active' ? ' cockpit-routine-card--active' : ''}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/trainer/protocols/${protocol.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/trainer/protocols/${protocol.id}`);
              }
            }}
          >
            <div className="cockpit-routine-card-body">
              <div className="cockpit-routine-card-name">{protocol.name}</div>
              <div className="cockpit-routine-card-meta">
                <Calendar size={12} strokeWidth={2} aria-hidden="true" />
                {formatDateForDisplay(protocol.startDate)}
                {' – '}
                {formatDateForDisplay(protocol.expirationDate)}
              </div>
            </div>
            <span className={getStatusBadgeClass(protocol.status)}>
              {getStatusLabel(protocol.status)}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

// --- Anamnese summary section ---
const AnamneseSummarySection = ({ anamneses, loading, studentId, onLinkAnamnesis }) => {
  const navigate = useNavigate();

  if (loading) return null;

  const preview = anamneses.slice(0, 2);
  const total = anamneses.length;

  return (
    <div className="cockpit-section">
      <header className="cockpit-section-header">
        <h2 className="cockpit-section-eyebrow">Anamneses</h2>
        <button
          type="button"
          className="cockpit-section-link"
          onClick={() => navigate(`/trainer/students/${studentId}/anamneses`)}
          aria-label={`Ver todas as ${total} anamneses`}
        >
          Ver todas ({total})
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {preview.length === 0 ? (
        <div className="cockpit-empty-inline">
          <div className="cockpit-empty-inline-icon" aria-hidden="true">
            <ClipboardList size={20} strokeWidth={2} />
          </div>
          <div className="cockpit-empty-inline-text">
            <p className="cockpit-empty-inline-title">Sem anamneses vinculadas</p>
            <p className="cockpit-empty-inline-desc">Vincule um questionário para o aluno responder.</p>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onLinkAnamnesis}
          >
            Vincular anamnese
          </button>
        </div>
      ) : (
        preview.map((link) => (
          <div key={link.id} className="cockpit-anamnese-card">
            <div className="cockpit-anamnese-card-text">
              <div className="cockpit-anamnese-card-title">
                {link.anamnesis.title}
              </div>
              {link.anamnesis.isGeneral && (
                <div className="cockpit-anamnese-card-meta">Geral</div>
              )}
            </div>
            <RowMenu
              ariaLabel={`Opções da anamnese ${link.anamnesis.title}`}
              extraItems={[
                {
                  label: 'Preencher com o aluno',
                  onClick: () => navigate(getAnamnesisFillPath(studentId, link.anamnesis.id)),
                },
                {
                  label: 'Ver respostas',
                  onClick: () =>
                    navigate(`/trainer/students/${studentId}/anamneses/${link.anamnesis.id}/response`),
                },
              ]}
            />
          </div>
        ))
      )}
    </div>
  );
};

RoutineHistorySection.propTypes = {
  protocols: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  studentId: PropTypes.string.isRequired,
  onCreateProtocol: PropTypes.func.isRequired,
};

AnamneseSummarySection.propTypes = {
  anamneses: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  studentId: PropTypes.string.isRequired,
  onLinkAnamnesis: PropTypes.func.isRequired,
};

export default StudentDetail;
