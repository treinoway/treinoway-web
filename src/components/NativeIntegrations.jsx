import usePushRegistration from '../hooks/usePushRegistration';
import usePushTokenSync from '../hooks/usePushTokenSync';
import useBackButton from '../hooks/useBackButton';
import useExternalLinks from '../hooks/useExternalLinks';
import useKeyboardAvoidance from '../hooks/useKeyboardAvoidance';
import { isNative } from '../platform';
import OfflineBanner from './OfflineBanner';

// Mounts the native-only behaviors (push, back button, external links, keyboard, offline notice); renders nothing on the website.
const NativeIntegrations = () => {
  usePushRegistration();
  usePushTokenSync();
  useBackButton();
  useExternalLinks();
  useKeyboardAvoidance();

  return isNative() ? <OfflineBanner /> : null;
};

export default NativeIntegrations;
