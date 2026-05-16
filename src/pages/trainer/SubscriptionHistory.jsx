import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import RowMenu from '../../components/RowMenu';
import {
  listSubscriptionsForStudent,
  listPaymentsForSubscription,
  markPaymentAsPaid,
  markPaymentAsPending,
  createPaymentCycle,
  deletePaymentCycle,
} from '../../api/subscriptions';
import {
  PAYMENT_STATUS,
  deriveEffectivePaymentStatus,
  todayDateString,
} from '../../utils/subscriptionHelpers';
import { formatCurrencyBRL } from '../../utils/currencyFormat';
import { formatDateForDisplay } from '../../utils/dateFormat';

const STATUS_PILL_CLASS = {
  [PAYMENT_STATUS.PAID]: 'fin-status-pill fin-status-pill--paid',
  [PAYMENT_STATUS.PENDING]: 'fin-status-pill fin-status-pill--pending',
  [PAYMENT_STATUS.OVERDUE]: 'fin-status-pill fin-status-pill--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'fin-status-pill fin-status-pill--cancelled',
};

const STATUS_LABEL = {
  [PAYMENT_STATUS.PAID]: 'Pago',
  [PAYMENT_STATUS.PENDING]: 'Pendente',
  [PAYMENT_STATUS.OVERDUE]: 'Atrasado',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelado',
};

const FILTERS = Object.freeze({
  ALL: 'all',
  PAID: PAYMENT_STATUS.PAID,
  PENDING: PAYMENT_STATUS.PENDING,
  OVERDUE: PAYMENT_STATUS.OVERDUE,
});

const FILTER_OPTIONS = [
  { key: FILTERS.ALL, label: 'Todos' },
  { key: FILTERS.PAID, label: 'Pagos' },
  { key: FILTERS.PENDING, label: 'Pendentes' },
  { key: FILTERS.OVERDUE, label: 'Atrasados' },
];

const SHORT_MONTH_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const LONG_MONTH_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

/**
 * Extract day (DD) and month abbreviation (MMM) from "YYYY-MM-DD".
 */
const parseCycleDate = (dateStr) => {
  if (!dateStr) return { day: '—', month: '' };
  const parts = dateStr.split('-');
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return {
    day: String(day).padStart(2, '0'),
    month: SHORT_MONTH_PT[month - 1] ?? '',
  };
};

/**
 * Format "YYYY-MM-DD" as "Mmm · YYYY" for the "desde" stat.
 */
const formatSinceDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  const month = Number(parts[1]);
  const year = parts[0];
  const monthName = LONG_MONTH_PT[month - 1] ?? '';
  return `${monthName} · ${year}`;
};

/**
 * Format "YYYY-MM-DD" as "DD/MM" (short period display).
 */
const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}`;
};

const groupByYear = (payments) => {
  const groups = new Map();
  payments.forEach((entry) => {
    const year = (entry.payment.cycleStartDate || '').slice(0, 4) || 'Sem data';
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(entry);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => (a > b ? -1 : 1));
};

/**
 * Build the period-meta line: plan name + payment info when paid.
 * Example: "Plano Performance · Pago em 03/04"
 */
const buildPeriodMeta = (entry) => {
  const planName = entry.subscription.planName || 'Plano';
  const isPaid = entry.effectiveStatus === PAYMENT_STATUS.PAID;
  if (isPaid && entry.payment.paidAt) {
    const paidShort = formatShortDate(
      typeof entry.payment.paidAt === 'string'
        ? entry.payment.paidAt.slice(0, 10)
        : null,
    );
    return `${planName} · Pago em ${paidShort}`;
  }
  return planName;
};

const SubscriptionHistory = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Stable ref so callbacks don't re-create on every toast render cycle
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [paymentsBySub, setPaymentsBySub] = useState({});
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [newCycleDate, setNewCycleDate] = useState(todayDateString());
  const [creatingCycle, setCreatingCycle] = useState(false);

  const loadStudent = useCallback(async () => {
    try {
      const response = await api.get('/trainer/students');
      const found = (response.data || []).find((s) => String(s.id) === String(studentId));
      setStudent(found || null);
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    }
  }, [studentId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const subs = await listSubscriptionsForStudent(studentId);
      setSubscriptions(subs);
      const paymentsMap = {};
      await Promise.all(
        subs.map(async (sub) => {
          try {
            paymentsMap[sub.id] = await listPaymentsForSubscription(sub.id);
          } catch (err) {
            console.error('[SubscriptionHistory] failed to load payments', err);
            paymentsMap[sub.id] = [];
          }
        }),
      );
      setPaymentsBySub(paymentsMap);
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStudent();
    loadHistory();
  }, [loadStudent, loadHistory]);

  const activeSubscription = useMemo(
    () => subscriptions.find((s) => s.status === 'active') || null,
    [subscriptions],
  );

  const allPaymentEntries = useMemo(() => {
    const entries = [];
    subscriptions.forEach((subscription) => {
      const payments = paymentsBySub[subscription.id] || [];
      payments.forEach((payment) => {
        entries.push({
          payment,
          subscription,
          effectiveStatus: deriveEffectivePaymentStatus(payment),
        });
      });
    });
    return entries.sort(
      (a, b) => (b.payment.cycleStartDate || '').localeCompare(a.payment.cycleStartDate || ''),
    );
  }, [subscriptions, paymentsBySub]);

  const filteredEntries = useMemo(() => {
    if (filter === FILTERS.ALL) return allPaymentEntries;
    return allPaymentEntries.filter((entry) => entry.effectiveStatus === filter);
  }, [allPaymentEntries, filter]);

  const grouped = useMemo(() => groupByYear(filteredEntries), [filteredEntries]);

  const totalRevenue = useMemo(
    () => allPaymentEntries
      .filter((entry) => entry.effectiveStatus === PAYMENT_STATUS.PAID)
      .reduce((acc, entry) => acc + Number(entry.payment.amount || 0), 0),
    [allPaymentEntries],
  );

  const firstChargeDate = useMemo(() => {
    const dates = allPaymentEntries
      .map((entry) => entry.payment.cycleStartDate)
      .filter(Boolean)
      .sort();
    return dates[0] || null;
  }, [allPaymentEntries]);

  const handleMarkPending = useCallback(async (entry) => {
    try {
      const reverted = await markPaymentAsPending(entry.payment.id);
      setPaymentsBySub((prev) => ({
        ...prev,
        [entry.subscription.id]: (prev[entry.subscription.id] || []).map(
          (p) => (p.id === reverted.id ? reverted : p),
        ),
      }));
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    }
  }, []);

  const handleMarkPaid = useCallback(async (entry) => {
    setPendingPaymentId(entry.payment.id);
    try {
      const updated = await markPaymentAsPaid(entry.payment.id);
      setPaymentsBySub((prev) => ({
        ...prev,
        [entry.subscription.id]: (prev[entry.subscription.id] || []).map(
          (p) => (p.id === updated.id ? updated : p),
        ),
      }));
      showToastRef.current('Pagamento registrado.', 'success', {
        actionLabel: 'Desfazer',
        duration: 5000,
        onAction: () => handleMarkPending(entry),
      });
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    } finally {
      setPendingPaymentId(null);
    }
  }, [handleMarkPending]);

  const handleDelete = async (entry) => {
    setConfirmDelete(null);
    try {
      await deletePaymentCycle(entry.payment.id);
      setPaymentsBySub((prev) => ({
        ...prev,
        [entry.subscription.id]: (prev[entry.subscription.id] || []).filter(
          (p) => p.id !== entry.payment.id,
        ),
      }));
      showToastRef.current('Cobrança excluída.', 'success');
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    }
  };

  const handleCreateCycle = async (event) => {
    event.preventDefault();
    if (!activeSubscription) {
      showToastRef.current('Esta opção requer uma assinatura ativa.', 'error');
      return;
    }
    setCreatingCycle(true);
    try {
      const created = await createPaymentCycle(activeSubscription.id, {
        cycleStartDate: newCycleDate,
      });
      setPaymentsBySub((prev) => ({
        ...prev,
        [activeSubscription.id]: [...(prev[activeSubscription.id] || []), created],
      }));
      setNewCycleOpen(false);
      setNewCycleDate(todayDateString());
      showToastRef.current('Cobrança adicionada.', 'success');
    } catch (err) {
      showToastRef.current(err.userMessage || translateError(err), 'error');
    } finally {
      setCreatingCycle(false);
    }
  };

  const studentName = useMemo(() => {
    if (!student) return 'Aluno';
    return [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || student.email;
  }, [student]);

  const amountDisplay = (amount) => {
    const formatted = formatCurrencyBRL(amount);
    // Strip "R$ " prefix — rendered separately as <small>
    return formatted.replace(/^R\$\s*/, '').trim();
  };

  return (
    <div>
      <button
        type="button"
        className="btn-back"
        onClick={() => navigate(`/trainer/students/${studentId}`)}
        aria-label="Voltar para o aluno"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Voltar para o aluno
      </button>

      {/* Page header */}
      <div className="fin-history-header">
        <div>
          <div className="fin-history-eyebrow">Histórico financeiro</div>
          <h1 className="fin-history-title">{studentName}</h1>
        </div>

        {/* Filter chips */}
        <div className="fin-chip-row" role="tablist" aria-label="Filtrar cobranças">
          {FILTER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.key}
              className={`fin-chip${filter === option.key ? ' fin-chip--active' : ''}`}
              role="tab"
              aria-selected={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stadium stats strip */}
      <div className="fin-history-strip">
        <div className="fin-history-stat">
          <span className="fin-history-stat-label">Receita total</span>
          <span className="fin-history-stat-value">
            <small>R$</small>
            {amountDisplay(totalRevenue)}
          </span>
        </div>
        <div className="fin-history-stat">
          <span className="fin-history-stat-label">Cobranças</span>
          <span className="fin-history-stat-value">{allPaymentEntries.length}</span>
        </div>
        <div className="fin-history-stat">
          <span className="fin-history-stat-label">Cliente desde</span>
          <span className="fin-history-stat-value fin-history-stat-value--sm">
            {firstChargeDate ? formatSinceDate(firstChargeDate) : '—'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="fin-skeleton">
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Sem cobranças registradas para este aluno</p>
        </div>
      ) : (
        grouped.map(([year, entries]) => (
          <section key={year} aria-label={`Cobranças de ${year}`}>
            <div className="fin-history-year-label">
              {year}
            </div>
            <div className="fin-history-row-list">
              {entries.map((entry) => {
                const isPaid = entry.effectiveStatus === PAYMENT_STATUS.PAID;
                const isMutating = pendingPaymentId === entry.payment.id;
                const { day, month } = parseCycleDate(entry.payment.cycleStartDate);
                const periodMeta = buildPeriodMeta(entry);
                const rowAriaLabel = `Ações da cobrança de ${formatDateForDisplay(entry.payment.cycleStartDate)}`;

                const rowMenuItems = isPaid
                  ? [{ label: 'Reverter pagamento', onClick: () => handleMarkPending(entry), danger: true }]
                  : [{ label: isMutating ? 'Carregando...' : 'Marcar pago', onClick: () => handleMarkPaid(entry), danger: false }];

                return (
                  <div key={entry.payment.id} className="fin-history-row">
                    {/* Cycle badge: DD stacked over MMM */}
                    <div className="fin-history-cycle" aria-hidden="true">
                      <span className="fin-history-cycle-num">{day}</span>
                      <span className="fin-history-cycle-month">{month}</span>
                    </div>

                    {/* Period info */}
                    <div>
                      <div className="fin-history-row-period">
                        {formatShortDate(entry.payment.cycleStartDate)}
                        {' – '}
                        {formatDateForDisplay(entry.payment.cycleEndDate)}
                      </div>
                      <div className="fin-history-row-period-meta">
                        {periodMeta}
                      </div>
                    </div>

                    {/* Amount + status pill (combined cell) */}
                    <div className="fin-history-row-amount">
                      <span className={STATUS_PILL_CLASS[entry.effectiveStatus] ?? 'fin-status-pill'}>
                        {STATUS_LABEL[entry.effectiveStatus] ?? entry.effectiveStatus}
                      </span>
                      <small>R$</small>
                      {amountDisplay(entry.payment.amount)}
                    </div>

                    {/* Three-dot menu — always present */}
                    <RowMenu
                      ariaLabel={rowAriaLabel}
                      onDelete={() => setConfirmDelete(entry)}
                      deleteLabel="Excluir"
                      extraItems={rowMenuItems}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {activeSubscription && (
        <div className="fin-history-add-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setNewCycleOpen(true)}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" /> Adicionar cobrança
          </button>
        </div>
      )}

      {/* Add cycle sheet */}
      {newCycleOpen && (
        <div className="overlay" onClick={() => setNewCycleOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Nova cobrança</h2>
            </div>
            <div className="bottom-sheet-body">
              <form className="form" onSubmit={handleCreateCycle}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cycle-date">Data de início do ciclo</label>
                  <input
                    id="cycle-date"
                    type="date"
                    className="form-input"
                    value={newCycleDate}
                    onChange={(e) => setNewCycleDate(e.target.value)}
                    required
                  />
                </div>
                <div className="btn-group btn-group--equal">
                  <button type="submit" className="btn-primary" disabled={creatingCycle}>
                    {creatingCycle ? 'Carregando...' : 'Adicionar'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setNewCycleOpen(false)}
                    disabled={creatingCycle}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">
              Excluir esta cobrança? O histórico ficará sem este registro. Esta ação não pode ser desfeita.
            </p>
            <div className="btn-group confirm-dialog-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDelete(confirmDelete)}
              >
                Excluir
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionHistory;
