import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import { isNative } from '../platform';
import { t } from '../i18n';
import NativeNotice from './NativeNotice';

// In the native app, tells accounts without the trainer role that the app is for trainers, with a way to sign out.
const TrainerOnlyGate = ({ children }) => {
  const { user, hasRole, logout } = useAuth();

  if (!isNative() || !user || hasRole('TRAINER')) return children;

  return (
    <NativeNotice title={t('nativeApp.trainerOnly.title')} body={t('nativeApp.trainerOnly.body')}>
      <button type="button" className="btn btn--secondary" onClick={() => logout()}>
        {t('nativeApp.trainerOnly.signOut')}
      </button>
    </NativeNotice>
  );
};

TrainerOnlyGate.propTypes = {
  children: PropTypes.node.isRequired,
};

export default TrainerOnlyGate;
