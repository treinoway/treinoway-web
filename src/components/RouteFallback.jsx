import { t } from '../i18n';

// Fallback shown while a lazily loaded route chunk downloads.
const RouteFallback = () => (
  <div className="loading-screen" role="status">
    {t('nativeApp.routeLoading')}
  </div>
);

export default RouteFallback;
