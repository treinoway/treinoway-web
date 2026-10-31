import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../api/axios';
import { getAppInfo, isNative } from '../platform';
import { isBelowMinimum } from '../utils/appVersion';
import { t } from '../i18n';
import NativeNotice from './NativeNotice';

// Asks the backend for the minimum version of this app; resolves the store URL when the running version is below it, else null.
async function findRequiredUpdateUrl() {
  const { appId, platform, version } = await getAppInfo();
  const { data } = await api.get('/app/min-version', { params: { appId, platform } });
  return isBelowMinimum(version, data?.minVersion) ? data.storeUrl || '' : null;
}

// Blocks the native app behind a store link when its version is below the minimum; a failed check never blocks.
const AppVersionGate = ({ children }) => {
  const [updateUrl, setUpdateUrl] = useState(null);

  useEffect(() => {
    if (!isNative()) return undefined;
    let cancelled = false;
    findRequiredUpdateUrl()
      .then((url) => {
        if (!cancelled && url !== null) setUpdateUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (updateUrl === null) return children;

  return (
    <NativeNotice title={t('nativeApp.update.title')} body={t('nativeApp.update.body')}>
      {updateUrl && <a className="btn btn--primary" href={updateUrl}>{t('nativeApp.update.cta')}</a>}
    </NativeNotice>
  );
};

AppVersionGate.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppVersionGate;
