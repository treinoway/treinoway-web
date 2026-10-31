import { Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import useConfirmDialog from '../hooks/useConfirmDialog';
import ConfirmDialog from './ds/ConfirmDialog';
import { t } from '../i18n';

// In-app account deletion: confirms, calls DELETE /me and signs out; a failure keeps the session and shows the translated error.
const DeleteAccountSection = () => {
  const { logout } = useAuth();
  const { dialogProps, requestConfirm } = useConfirmDialog();

  const handleRequestDelete = () => requestConfirm({
    message: t('nativeApp.deleteAccount.message'),
    confirmLabel: t('nativeApp.deleteAccount.confirm'),
    busyLabel: t('nativeApp.deleteAccount.busy'),
    onConfirm: async () => {
      await api.delete('/me');
      await logout({ skipDeviceRemoval: true });
    },
  });

  return (
    <>
      <button type="button" onClick={handleRequestDelete} className="account-action-row account-action-row--danger">
        <Trash2 size={18} strokeWidth={2} className="account-action-row__icon" aria-hidden="true" />
        {t('nativeApp.deleteAccount.action')}
      </button>
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
};

export default DeleteAccountSection;
