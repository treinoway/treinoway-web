import { isNative, secureStorage } from '../platform';
import { SECURE_SESSION_KEYS } from '../constants/nativeAuth';

const INSTALL_MARKER_KEY = 'treinoway.installMarker';

// Reads the marker; null means "unknown" (storage blocked), which must never wipe a session.
const hasInstallMarker = () => {
  try {
    return localStorage.getItem(INSTALL_MARKER_KEY) !== null;
  } catch {
    return true;
  }
};

// Writes the marker, tolerating blocked storage.
const writeInstallMarker = () => {
  try {
    localStorage.setItem(INSTALL_MARKER_KEY, String(Date.now()));
  } catch {
    return;
  }
};

// Native boot step: the iOS Keychain survives an uninstall but localStorage does not, so a missing marker means a fresh install and leftover secure keys are wiped before the session is restored.
export async function clearSecureSessionOnFreshInstall() {
  if (!isNative() || hasInstallMarker()) return false;
  await Promise.all(SECURE_SESSION_KEYS.map((key) => secureStorage.removeItem(key).catch(() => undefined)));
  writeInstallMarker();
  return true;
}
