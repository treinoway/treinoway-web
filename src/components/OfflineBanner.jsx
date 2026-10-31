import useOnlineStatus from '../hooks/useOnlineStatus';
import { t } from '../i18n';

// Notice shown while the device has no connection; renders nothing when online.
const OfflineBanner = () => {
  const online = useOnlineStatus();

  if (online) return null;
  return (
    <div className="offline-banner type-body" role="status">
      {t('nativeApp.offline')}
    </div>
  );
};

export default OfflineBanner;
