import { useCallback, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { t, tf } from '../i18n';
import {
  markPaymentAsPaid,
  markPaymentAsPending,
  updatePayment,
  voidPayment,
} from '../api/subscriptions';
import { classifyPaymentError, getErrorMessage } from '../utils/financeErrors';
import { FINANCE_UNDO_TOAST_MS, PAYMENT_CONFIRM, PAYMENT_SHEET } from '../constants/finance';
import {
  formatCyclePeriod,
  formatMoneyBRL,
  formatMonthName,
  formatShortDate,
  timestampToBusinessDate,
} from '../utils/subscriptionHelpers';

const identityOf = (payment, isOverview) => (isOverview
  ? payment.student?.name || t('finance.unnamedStudent')
  : formatCyclePeriod(payment.cycleStartDate, payment.cycleEndDate));

/** "{nome ou período} · {R$ valor} · venc. {DD/MM}" for sheets. */
export const buildPaymentContextLabel = (payment, isOverview) =>
  `${identityOf(payment, isOverview)} · ${formatMoneyBRL(payment.amount)} · venc. ${formatShortDate(payment.dueDate)}`;

const buildVoidMessage = (payment, isOverview) => (isOverview
  ? tf('finance.confirm.voidMessage', {
    amount: formatMoneyBRL(payment.amount),
    name: identityOf(payment, true),
    date: formatShortDate(payment.dueDate),
  })
  : tf('finance.confirm.voidMessageHistory', { period: identityOf(payment, false) }));

/** voidedAt predicts the outcome: a once-voided charge reverts to Anulada (8-5). */
const buildRevertMessage = (payment) => {
  const month = formatMonthName((timestampToBusinessDate(payment.paidAt) || '').slice(0, 7));
  const key = payment.voidedAt ? 'finance.confirm.revertToVoid' : 'finance.confirm.revertToPending';
  return tf(key, { month });
};

/**
 * Every payment mutation (spec §3.1–3.5, §6.3) behind one hook: inline
 * MARCAR PAGO with "Desfazer", mark paid on a date, edit, void, revert.
 * `onChanged` refetches the owning data after any success or stale (409) error.
 */
const usePaymentActions = ({ onChanged, isOverview = true }) => {
  const { showToast } = useToast();
  const [mutatingId, setMutatingId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const reportError = useCallback((err) => {
    const outcome = classifyPaymentError(err);
    if (outcome.field) return outcome;
    showToast(outcome.message, outcome.toastType);
    if (outcome.closeSheet) setSheet(null);
    if (outcome.refetch) onChanged();
    return null;
  }, [onChanged, showToast]);

  const handleUndo = useCallback(async (paymentId) => {
    try {
      await markPaymentAsPending(paymentId);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
    onChanged();
  }, [onChanged, showToast]);

  const handleMarkPaid = useCallback(async (payment) => {
    setMutatingId(payment.id);
    try {
      await markPaymentAsPaid(payment.id);
      showToast(t('finance.toast.paymentRegistered'), 'success', {
        actionLabel: t('finance.toast.undo'),
        duration: FINANCE_UNDO_TOAST_MS,
        onAction: () => handleUndo(payment.id),
      });
      onChanged();
    } catch (err) {
      reportError(err);
    } finally {
      setMutatingId(null);
    }
  }, [handleUndo, onChanged, reportError, showToast]);

  const runSheetMutation = useCallback(async (request, successMessage) => {
    try {
      await request();
      showToast(successMessage, 'success');
      setSheet(null);
      onChanged();
      return null;
    } catch (err) {
      return reportError(err);
    }
  }, [onChanged, reportError, showToast]);

  const submitMarkPaid = (paidAt) => runSheetMutation(
    () => markPaymentAsPaid(sheet.payment.id, { paidAt }),
    tf('finance.toast.paymentRegisteredOn', { date: formatShortDate(paidAt) }),
  );

  const submitEdit = (patch) => runSheetMutation(
    () => updatePayment(sheet.payment.id, patch),
    t('finance.toast.paymentSaved'),
  );

  const runConfirm = async (request, successMessage) => {
    setConfirm((prev) => ({ ...prev, busy: true }));
    try {
      await request();
      showToast(successMessage, 'success');
      onChanged();
    } catch (err) {
      reportError(err);
    } finally {
      setConfirm(null);
    }
  };

  const handleConfirm = () => {
    const { type, payment } = confirm;
    if (type === PAYMENT_CONFIRM.VOID) return runConfirm(() => voidPayment(payment.id), t('finance.toast.paymentVoided'));
    return runConfirm(() => markPaymentAsPending(payment.id), t('finance.toast.paymentReverted'));
  };

  const rowHandlers = {
    onMarkPaid: handleMarkPaid,
    onMarkPaidOnDate: (payment) => setSheet({ type: PAYMENT_SHEET.MARK_PAID, payment }),
    onEdit: (payment) => setSheet({ type: PAYMENT_SHEET.EDIT, payment }),
    onVoid: (payment) => setConfirm({ type: PAYMENT_CONFIRM.VOID, payment, message: buildVoidMessage(payment, isOverview) }),
    onRevert: (payment) => setConfirm({ type: PAYMENT_CONFIRM.REVERT, payment, message: buildRevertMessage(payment) }),
  };

  const layer = {
    sheet,
    confirm,
    contextLabel: sheet ? buildPaymentContextLabel(sheet.payment, isOverview) : '',
    onCloseSheet: () => setSheet(null),
    onSubmitMarkPaid: submitMarkPaid,
    onSubmitEdit: submitEdit,
    onConfirm: handleConfirm,
    onCancelConfirm: () => setConfirm(null),
  };

  return { mutatingId, rowHandlers, layer };
};

export default usePaymentActions;
