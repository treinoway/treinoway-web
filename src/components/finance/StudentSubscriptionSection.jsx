import PropTypes from 'prop-types';
import SubscriptionBlock from './SubscriptionBlock';
import AssignPlanSheet from './AssignPlanSheet';
import PaymentActionsLayer from './PaymentActionsLayer';
import ConfirmDialog from '../ds/ConfirmDialog';
import Modal from '../ds/Modal';
import { t } from '../../i18n';
import { FINANCE_OVERDUE_GRACE_DAYS_FALLBACK } from '../../constants/finance';

/** Sheet shown when the user has plans, but none of the kind this page can assign. */
const NoPlanOfKindSheet = ({ serviceKind, onClose }) => (
  <Modal
    title={t('finance.assign.titleAssign')}
    onClose={onClose}
    footer={<button type="button" className="btn btn--secondary" onClick={onClose}>{t('finance.assign.close')}</button>}
  >
    <p className="type-body">{t(`finance.assign.noPlanOfKind.${serviceKind}`)}</p>
    <p className="type-body text-light">{t('finance.assign.noPlanOfKindHint')}</p>
  </Modal>
);

NoPlanOfKindSheet.propTypes = { serviceKind: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired };

/**
 * StudentDetail "Assinatura" block plus its sheets and dialogs, rendered from
 * `useStudentSubscriptionManager`'s state. No API calls here.
 */
const StudentSubscriptionSection = ({ manager, onViewHistory }) => {
  const { paymentActions } = manager;
  const activePlans = manager.plans.filter((plan) => !plan.isArchived);
  const isOtherKindOnly = activePlans.length === 0 && Boolean(manager.serviceKind) && Boolean(manager.hasAnyPlan);

  return (
    <>
      <SubscriptionBlock
        loading={manager.loading}
        error={manager.error}
        subscription={manager.subscription}
        planName={manager.planName}
        payments={manager.payments}
        mutatingId={paymentActions.mutatingId}
        rowHandlers={paymentActions.rowHandlers}
        onRetry={manager.reload}
        onAssign={manager.openAssign}
        onReplace={manager.openReplace}
        onCancel={manager.requestCancel}
        onViewHistory={onViewHistory}
      />

      {manager.assignMode && isOtherKindOnly && (
        <NoPlanOfKindSheet serviceKind={manager.serviceKind} onClose={manager.closeAssign} />
      )}

      {manager.assignMode && !isOtherKindOnly && (
        <AssignPlanSheet
          mode={manager.assignMode}
          plans={activePlans}
          currentPlanId={manager.subscription?.planId ?? null}
          currentPlanName={manager.planName}
          onClose={manager.closeAssign}
          onAssign={manager.handleAssign}
          onCreatePlanAndAssign={manager.handleCreatePlanAndAssign}
          onAlreadyActive={manager.handleAlreadyActive}
          onPlanArchived={manager.reloadPlans}
        />
      )}

      {manager.cancelState && (
        <ConfirmDialog
          message={manager.cancelMessage}
          confirmLabel={t('finance.confirm.cancelSubscriptionConfirm')}
          cancelLabel={t('finance.back')}
          busy={manager.cancelState.busy}
          busyLabel={t('finance.loading')}
          onConfirm={manager.handleConfirmCancel}
          onCancel={manager.dismissCancel}
        />
      )}

      <PaymentActionsLayer {...paymentActions.layer} graceDays={FINANCE_OVERDUE_GRACE_DAYS_FALLBACK} />
    </>
  );
};

StudentSubscriptionSection.propTypes = {
  manager: PropTypes.shape({
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    subscription: PropTypes.object,
    planName: PropTypes.string.isRequired,
    payments: PropTypes.array.isRequired,
    plans: PropTypes.array.isRequired,
    serviceKind: PropTypes.string,
    hasAnyPlan: PropTypes.bool,
    paymentActions: PropTypes.object.isRequired,
    assignMode: PropTypes.string,
    cancelState: PropTypes.object,
    cancelMessage: PropTypes.string.isRequired,
    reload: PropTypes.func.isRequired,
    reloadPlans: PropTypes.func.isRequired,
    openAssign: PropTypes.func.isRequired,
    openReplace: PropTypes.func.isRequired,
    closeAssign: PropTypes.func.isRequired,
    requestCancel: PropTypes.func.isRequired,
    dismissCancel: PropTypes.func.isRequired,
    handleAssign: PropTypes.func.isRequired,
    handleCreatePlanAndAssign: PropTypes.func.isRequired,
    handleAlreadyActive: PropTypes.func.isRequired,
    handleConfirmCancel: PropTypes.func.isRequired,
  }).isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

export default StudentSubscriptionSection;
