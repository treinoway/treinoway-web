import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import FinanceiroHero from '../../components/FinanceiroHero';
import PaymentRow from '../../components/PaymentRow';
import PlanCard from '../../components/PlanCard';
import PlanFormSheet from '../../components/PlanFormSheet';
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  archiveSubscriptionPlan,
  unarchiveSubscriptionPlan,
  listAllSubscriptions,
  listPaymentsForSubscription,
  markPaymentAsPaid,
  markPaymentAsPending,
} from '../../api/subscriptions';
import {
  PAYMENT_STATUS,
  RECURRENCE_LABEL,
  currentYearMonth,
  deriveEffectivePaymentStatus,
  isDateInYearMonth,
  normalizeForSearch,
  todayDateString,
} from '../../utils/subscriptionHelpers';

const TABS = Object.freeze({ BILLING: 'billing', PLANS: 'plans' });

const getInitials = (name = '') => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase() || trimmed[0].toUpperCase();
};

const getStudentName = (student) => {
  if (!student) return 'Aluno';
  const fromName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  return fromName || student.email || 'Aluno';
};

/**
 * Build 30 waveform bars for the revenue chart.
 * Each bar covers one calendar day of the current month up to today,
 * plus future days rendered as "empty".
 * Height is proportional to revenue on that day (capped at 100%).
 */
const buildRevenueWaveform = (allPaymentRows, yearMonth) => {
  const today = todayDateString();
  const [year, month] = yearMonth.split('-').map(Number);

  // Build 30-entry array for days 1–30 of the month (or actual days)
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalBars = Math.min(30, daysInMonth);

  // Aggregate paid/pending/overdue amounts by day
  const byDay = new Map();
  allPaymentRows.forEach(({ payment, effectiveStatus }) => {
    const dateRef = effectiveStatus === PAYMENT_STATUS.PAID
      ? (payment.paidAt ? payment.paidAt.slice(0, 10) : null)
      : (payment.dueDate || payment.cycleStartDate || null);
    if (!dateRef || !isDateInYearMonth(dateRef, yearMonth)) return;
    const day = Number(dateRef.slice(8, 10));
    if (!day) return;
    const prev = byDay.get(day) || { paid: 0, pending: 0, overdue: 0 };
    const amount = Number(payment.amount || 0);
    if (effectiveStatus === PAYMENT_STATUS.PAID) prev.paid += amount;
    else if (effectiveStatus === PAYMENT_STATUS.OVERDUE) prev.overdue += amount;
    else prev.pending += amount;
    byDay.set(day, prev);
  });

  // Find max total for normalisation
  const maxAmount = Array.from(byDay.values()).reduce((max, d) => {
    const total = d.paid + d.pending + d.overdue;
    return total > max ? total : max;
  }, 0);

  const bars = [];
  for (let i = 0; i < totalBars; i++) {
    const day = i + 1;
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const isFuture = dateStr > today;

    if (isFuture) {
      bars.push({ date: dateStr, status: 'empty', pct: 0, isToday: false });
      continue;
    }

    const dayData = byDay.get(day);
    if (!dayData) {
      bars.push({ date: dateStr, status: 'empty', pct: 0, isToday });
      continue;
    }

    const total = dayData.paid + dayData.pending + dayData.overdue;
    const pct = maxAmount > 0 ? Math.max(10, Math.round((total / maxAmount) * 100)) : 10;

    let status = 'success';
    if (dayData.overdue > 0 && dayData.paid === 0) status = 'danger';
    else if (dayData.pending > 0 && dayData.paid === 0) status = 'partial';

    bars.push({ date: dateStr, status, pct, isToday });
  }

  return bars;
};

const Financeiro = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(TABS.BILLING);
  const [yearMonth, setYearMonth] = useState(() => currentYearMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [overdueFilterActive, setOverdueFilterActive] = useState(false);
  const [showArchivedPlans, setShowArchivedPlans] = useState(false);

  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptionRows, setSubscriptionRows] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadStudents = useCallback(async () => {
    try {
      const response = await api.get('/trainer/students');
      setStudents(response.data || []);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [showToast]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const data = await listSubscriptionPlans({ includeArchived: true });
      setPlans(data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLoadingPlans(false);
    }
  }, [showToast]);

  const loadBilling = useCallback(async () => {
    setLoadingBilling(true);
    try {
      const subscriptions = await listAllSubscriptions({ status: 'active' });
      const enriched = await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            const payments = await listPaymentsForSubscription(subscription.id);
            return { subscription, payments };
          } catch (err) {
            console.error('[Financeiro] failed to load payments for sub', subscription.id, err);
            return { subscription, payments: [] };
          }
        }),
      );
      setSubscriptionRows(enriched);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLoadingBilling(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadStudents();
    loadPlans();
    loadBilling();
  }, [loadStudents, loadPlans, loadBilling]);

  const studentsById = useMemo(() => {
    const map = new Map();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const plansById = useMemo(() => {
    const map = new Map();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  const allPaymentRows = useMemo(() => {
    const rows = [];
    subscriptionRows.forEach(({ subscription, payments }) => {
      payments.forEach((payment) => {
        const effectiveStatus = deriveEffectivePaymentStatus(payment);
        const student = studentsById.get(subscription.studentId);
        const plan = plansById.get(subscription.planId);
        rows.push({
          payment,
          subscription,
          student,
          plan,
          effectiveStatus,
          studentName: getStudentName(student),
          planName: plan?.name || subscription.planName || '—',
          recurrenceLabel: plan?.recurrenceLabel
            || RECURRENCE_LABEL[subscription.recurrence]
            || RECURRENCE_LABEL[plan?.recurrence]
            || '',
        });
      });
    });
    return rows;
  }, [subscriptionRows, studentsById, plansById]);

  const overdueRows = useMemo(
    () => allPaymentRows.filter((r) => r.effectiveStatus === PAYMENT_STATUS.OVERDUE),
    [allPaymentRows],
  );

  const monthlyPending = useMemo(
    () => allPaymentRows.filter(
      (r) => r.effectiveStatus === PAYMENT_STATUS.PENDING
        && isDateInYearMonth(r.payment.dueDate || r.payment.cycleStartDate, yearMonth),
    ),
    [allPaymentRows, yearMonth],
  );

  const monthlyPaid = useMemo(
    () => allPaymentRows.filter(
      (r) => r.effectiveStatus === PAYMENT_STATUS.PAID
        && isDateInYearMonth((r.payment.paidAt || r.payment.cycleStartDate || '').slice(0, 10), yearMonth),
    ),
    [allPaymentRows, yearMonth],
  );

  const stats = useMemo(() => {
    const sum = (rows) => rows.reduce((acc, r) => acc + Number(r.payment.amount || 0), 0);
    const uniqueStudents = (rows) => new Set(rows.map((r) => r.subscription.studentId)).size;
    return {
      paid: { amount: sum(monthlyPaid), students: uniqueStudents(monthlyPaid) },
      pending: { amount: sum(monthlyPending), students: uniqueStudents(monthlyPending) },
      overdue: { amount: sum(overdueRows), students: uniqueStudents(overdueRows) },
    };
  }, [monthlyPaid, monthlyPending, overdueRows]);

  // Max overdue days across all overdue rows
  const maxOverdueDays = useMemo(() => {
    const today = todayDateString();
    return overdueRows.reduce((max, r) => {
      const ref = r.payment.cycleEndDate || r.payment.dueDate;
      if (!ref) return max;
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays > max ? diffDays : max;
    }, 0);
  }, [overdueRows]);

  const totalStudentsBilled = useMemo(() => {
    const ids = new Set([
      ...monthlyPaid.map((r) => r.subscription.studentId),
      ...monthlyPending.map((r) => r.subscription.studentId),
      ...overdueRows.map((r) => r.subscription.studentId),
    ]);
    return ids.size;
  }, [monthlyPaid, monthlyPending, overdueRows]);

  const waveformBars = useMemo(
    () => buildRevenueWaveform(allPaymentRows, yearMonth),
    [allPaymentRows, yearMonth],
  );

  const filterByQuery = useCallback(
    (rows) => {
      if (!debouncedQuery.trim()) return rows;
      const needle = normalizeForSearch(debouncedQuery);
      return rows.filter((r) => normalizeForSearch(r.studentName).includes(needle));
    },
    [debouncedQuery],
  );

  const overdueDisplayRows = useMemo(() => filterByQuery(overdueRows), [filterByQuery, overdueRows]);

  const pendingDisplayRows = useMemo(
    () => filterByQuery(overdueFilterActive ? [] : monthlyPending),
    [filterByQuery, overdueFilterActive, monthlyPending],
  );

  const paidRows = useMemo(() => filterByQuery(monthlyPaid), [filterByQuery, monthlyPaid]);

  const subscribersCountByPlan = useMemo(() => {
    const counts = new Map();
    subscriptionRows.forEach(({ subscription }) => {
      if (subscription.status !== 'active') return;
      counts.set(subscription.planId, (counts.get(subscription.planId) || 0) + 1);
    });
    return counts;
  }, [subscriptionRows]);

  // The plan with the most active subscribers is "featured"
  const featuredPlanId = useMemo(() => {
    let maxCount = 0;
    let featuredId = null;
    subscribersCountByPlan.forEach((count, planId) => {
      if (count > maxCount) { maxCount = count; featuredId = planId; }
    });
    return featuredId;
  }, [subscribersCountByPlan]);

  const visiblePlans = useMemo(
    () => plans.filter((p) => showArchivedPlans || !p.isArchived),
    [plans, showArchivedPlans],
  );

  const handleMarkPaid = async (row) => {
    setPendingPaymentId(row.payment.id);
    try {
      const updated = await markPaymentAsPaid(row.payment.id);
      setSubscriptionRows((prev) => prev.map((entry) => {
        if (entry.subscription.id !== row.subscription.id) return entry;
        return {
          ...entry,
          payments: entry.payments.map((p) => (p.id === updated.id ? updated : p)),
        };
      }));
      showToast('Pagamento registrado.', 'success', {
        actionLabel: 'Desfazer',
        duration: 5000,
        onAction: async () => {
          try {
            const reverted = await markPaymentAsPending(updated.id);
            setSubscriptionRows((prev) => prev.map((entry) => {
              if (entry.subscription.id !== row.subscription.id) return entry;
              return {
                ...entry,
                payments: entry.payments.map((p) => (p.id === reverted.id ? reverted : p)),
              };
            }));
          } catch (err) {
            showToast(err.userMessage || translateError(err), 'error');
          }
        },
      });
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setPendingPaymentId(null);
    }
  };

  const handleMarkPending = async (row) => {
    try {
      const reverted = await markPaymentAsPending(row.payment.id);
      setSubscriptionRows((prev) => prev.map((entry) => {
        if (entry.subscription.id !== row.subscription.id) return entry;
        return {
          ...entry,
          payments: entry.payments.map((p) => (p.id === reverted.id ? reverted : p)),
        };
      }));
      showToast('Pagamento revertido.', 'success');
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  };

  const handlePlanSubmit = async (payload) => {
    if (editingPlan) {
      const updated = await updateSubscriptionPlan(editingPlan.id, payload);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast('Plano atualizado.', 'success');
    } else {
      const created = await createSubscriptionPlan(payload);
      setPlans((prev) => [...prev, created]);
      showToast('Plano criado.', 'success');
    }
    setPlanFormOpen(false);
    setEditingPlan(null);
  };

  const handleArchiveToggle = async (plan) => {
    try {
      const updated = plan.isArchived
        ? await unarchiveSubscriptionPlan(plan.id)
        : await archiveSubscriptionPlan(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(plan.isArchived ? 'Plano desarquivado.' : 'Plano arquivado.', 'success');
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  };

  const openHistory = (row) => {
    navigate(`/trainer/students/${row.subscription.studentId}/subscription-history`);
  };

  const totalBillingCount = overdueRows.length + monthlyPending.length + monthlyPaid.length;

  return (
    <div>
      <FinanceiroHero
        yearMonth={yearMonth}
        onYearMonthChange={setYearMonth}
        paidAmount={stats.paid.amount}
        pendingAmount={stats.pending.amount}
        pendingStudents={stats.pending.students}
        overdueAmount={stats.overdue.amount}
        overdueStudents={stats.overdue.students}
        overdueDays={maxOverdueDays}
        totalStudentsBilled={totalStudentsBilled}
        waveformBars={waveformBars}
      />

      {/* Tabs + New-charge action */}
      <div className="fin-page-row">
        <div className="fin-tabs" role="tablist" aria-label="Visão financeira">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.BILLING}
            className={`fin-tab-btn${activeTab === TABS.BILLING ? ' fin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(TABS.BILLING)}
          >
            Cobranças
            <span className="fin-tab-count">{totalBillingCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TABS.PLANS}
            className={`fin-tab-btn${activeTab === TABS.PLANS ? ' fin-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(TABS.PLANS)}
          >
            Planos
            <span className="fin-tab-count">{visiblePlans.length}</span>
          </button>
        </div>
      </div>

      {activeTab === TABS.BILLING && (
        <section aria-label="Cobranças">
          {/* Search + filter chips */}
          <div className="fin-toolbar">
            <input
              type="search"
              className="fin-search-input"
              placeholder="Buscar por aluno"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar cobranças por aluno"
            />
            <div className="fin-chip-row" role="group" aria-label="Filtrar cobranças">
              <button
                type="button"
                className={`fin-chip${!overdueFilterActive ? ' fin-chip--active' : ''}`}
                onClick={() => setOverdueFilterActive(false)}
              >
                Todas
              </button>
              {overdueRows.length > 0 && (
                <button
                  type="button"
                  className={`fin-chip${overdueFilterActive ? ' fin-chip--overdue-active' : ''}`}
                  onClick={() => setOverdueFilterActive(true)}
                >
                  Atrasadas · {overdueRows.length}
                </button>
              )}
            </div>
          </div>

          {loadingBilling ? (
            <div className="fin-skeleton">
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </div>
          ) : (
            <>
              {/* Section: Atrasados */}
              {overdueDisplayRows.length > 0 && (
                <section className="fin-section">
                  <div className="fin-section-head">
                    <h2 className="fin-section-title">Atrasados</h2>
                    <span className="fin-section-aside">
                      {overdueDisplayRows.length} {overdueDisplayRows.length === 1 ? 'cobrança' : 'cobranças'}
                    </span>
                  </div>
                  <div className="fin-payment-list">
                    {overdueDisplayRows.map((row) => (
                      <PaymentRow
                        key={row.payment.id}
                        payment={row.payment}
                        effectiveStatus={row.effectiveStatus}
                        studentName={row.studentName}
                        studentInitials={getInitials(row.studentName)}
                        planName={row.planName}
                        recurrenceLabel={row.recurrenceLabel}
                        isMutating={pendingPaymentId === row.payment.id}
                        onMarkPaid={() => handleMarkPaid(row)}
                        onMarkPending={() => handleMarkPending(row)}
                        onViewHistory={() => openHistory(row)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Section: Pendentes */}
              {!overdueFilterActive && (
                <section className="fin-section">
                  <div className="fin-section-head">
                    <h2 className="fin-section-title">Pendentes do mês</h2>
                    <span className="fin-section-aside">
                      {pendingDisplayRows.length} {pendingDisplayRows.length === 1 ? 'cobrança' : 'cobranças'}
                    </span>
                  </div>
                  {pendingDisplayRows.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-state-title">
                        {debouncedQuery.trim()
                          ? `Nenhum aluno encontrado para "${debouncedQuery}"`
                          : 'Sem cobranças pendentes neste mês.'}
                      </p>
                    </div>
                  ) : (
                    <div className="fin-payment-list">
                      {pendingDisplayRows.map((row) => (
                        <PaymentRow
                          key={row.payment.id}
                          payment={row.payment}
                          effectiveStatus={row.effectiveStatus}
                          studentName={row.studentName}
                          studentInitials={getInitials(row.studentName)}
                          planName={row.planName}
                          recurrenceLabel={row.recurrenceLabel}
                          isMutating={pendingPaymentId === row.payment.id}
                          onMarkPaid={() => handleMarkPaid(row)}
                          onMarkPending={() => handleMarkPending(row)}
                          onViewHistory={() => openHistory(row)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Section: Recebidos (collapsible) */}
              {!overdueFilterActive && (
                <details className="fin-paid-details">
                  <summary className="fin-paid-summary">
                    Ver {paidRows.length} {paidRows.length === 1 ? 'pago' : 'pagos'} em{' '}
                    {yearMonth}
                  </summary>
                  <div className="fin-payment-list">
                    {paidRows.map((row) => (
                      <PaymentRow
                        key={row.payment.id}
                        payment={row.payment}
                        effectiveStatus={row.effectiveStatus}
                        studentName={row.studentName}
                        studentInitials={getInitials(row.studentName)}
                        planName={row.planName}
                        recurrenceLabel={row.recurrenceLabel}
                        isMutating={pendingPaymentId === row.payment.id}
                        onMarkPaid={() => handleMarkPaid(row)}
                        onMarkPending={() => handleMarkPending(row)}
                        onViewHistory={() => openHistory(row)}
                      />
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === TABS.PLANS && (
        <section aria-label="Planos">
          <div className="fin-plans-toggle-toolbar">
            <label className="switch">
              <input
                type="checkbox"
                checked={showArchivedPlans}
                onChange={(e) => setShowArchivedPlans(e.target.checked)}
              />
              <span>Mostrar arquivados</span>
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setEditingPlan(null); setPlanFormOpen(true); }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> Novo plano
            </button>
          </div>

          {loadingPlans ? (
            <div className="fin-skeleton">
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-title">Crie seu primeiro plano de assinatura</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => { setEditingPlan(null); setPlanFormOpen(true); }}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" /> Novo plano
              </button>
            </div>
          ) : (
            <div className="fin-plan-grid">
              {visiblePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  subscribersCount={subscribersCountByPlan.get(plan.id) || 0}
                  featured={plan.id === featuredPlanId && !plan.isArchived}
                  onEdit={() => { setEditingPlan(plan); setPlanFormOpen(true); }}
                  onArchiveToggle={() => handleArchiveToggle(plan)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <PlanFormSheet
        open={planFormOpen}
        plan={editingPlan}
        onClose={() => { setPlanFormOpen(false); setEditingPlan(null); }}
        onSubmit={handlePlanSubmit}
      />
    </div>
  );
};

export default Financeiro;
