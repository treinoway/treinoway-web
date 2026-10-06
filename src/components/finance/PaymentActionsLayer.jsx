import PropTypes from 'prop-types';
import MarkPaidSheet from './MarkPaidSheet';
import EditPaymentSheet from './EditPaymentSheet';
import ConfirmDialog from '../ds/ConfirmDialog';
import { t } from '../../i18n';
import { PAYMENT_CONFIRM, PAYMENT_SHEET } from '../../constants/finance';

/**
 * Renders whichever payment sheet or confirm dialog `usePaymentActions`
 * currently has open. Pure presentation — the hook owns the API calls.
 * Void is destructive (danger); revert is reversible (primary).
 */
const PaymentActionsLayer = ({
  sheet,
  confirm,
  contextLabel,
  graceDays,
  onCloseSheet,
  onSubmitMarkPaid,
  onSubmitEdit,
  onConfirm,
  onCancelConfirm,
}) => {
  const isVoidConfirm = confirm?.type === PAYMENT_CONFIRM.VOID;

  return (
    <>
      {sheet?.type === PAYMENT_SHEET.MARK_PAID && (
        <MarkPaidSheet payment={sheet.payment} contextLabel={contextLabel} onClose={onCloseSheet} onSubmit={onSubmitMarkPaid} />
      )}
      {sheet?.type === PAYMENT_SHEET.EDIT && (
        <EditPaymentSheet
          payment={sheet.payment}
          contextLabel={contextLabel}
          graceDays={graceDays}
          onClose={onCloseSheet}
          onSubmit={onSubmitEdit}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmTone={isVoidConfirm ? 'danger' : 'primary'}
          confirmLabel={t(isVoidConfirm ? 'finance.confirm.voidConfirm' : 'finance.confirm.revertConfirm')}
          cancelLabel={t(isVoidConfirm ? 'finance.back' : 'finance.cancel')}
          busy={Boolean(confirm.busy)}
          busyLabel={t('finance.loading')}
          onConfirm={onConfirm}
          onCancel={onCancelConfirm}
        />
      )}
    </>
  );
};

PaymentActionsLayer.propTypes = {
  sheet: PropTypes.shape({ type: PropTypes.string.isRequired, payment: PropTypes.object.isRequired }),
  confirm: PropTypes.shape({
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    busy: PropTypes.bool,
  }),
  contextLabel: PropTypes.string.isRequired,
  graceDays: PropTypes.number.isRequired,
  onCloseSheet: PropTypes.func.isRequired,
  onSubmitMarkPaid: PropTypes.func.isRequired,
  onSubmitEdit: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancelConfirm: PropTypes.func.isRequired,
};

export default PaymentActionsLayer;
