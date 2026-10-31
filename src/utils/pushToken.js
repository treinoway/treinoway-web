import { isNative, push } from '../platform';

// Deletes the local FCM token after the session ended, so the device stops receiving that account's pushes even when the server could not be told (offline, expired session); never throws, never blocks.
export function discardLocalPushToken() {
  if (!isNative()) return Promise.resolve();
  return Promise.resolve()
    .then(() => push.deleteToken())
    .catch((error) => console.error('[push] could not delete the local token:', error));
}
