import { FirebaseMessaging } from '@capacitor-firebase/messaging';

// Asks the OS for notification permission; resolves 'granted' or 'denied'.
async function requestPermission() {
  const { receive } = await FirebaseMessaging.requestPermissions();
  return receive === 'granted' ? 'granted' : 'denied';
}

// Resolves the FCM registration token (also on iOS), or null when Firebase is not configured in this build.
async function getToken() {
  try {
    const { token } = await FirebaseMessaging.getToken();
    return token || null;
  } catch (error) {
    console.error('[push] FCM token unavailable:', error);
    return null;
  }
}

// Calls the callback with the data payload of every tapped notification; resolves an unsubscribe function.
async function onNotificationOpened(callback) {
  const handle = await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    callback(event.notification?.data ?? {});
  });
  return () => handle.remove();
}

// Deletes the local FCM token so the device stops receiving pushes of the ended session.
async function deleteToken() {
  await FirebaseMessaging.deleteToken();
}

// Calls the callback with every new FCM token (first issue and rotation); resolves an unsubscribe function.
async function onTokenReceived(callback) {
  const handle = await FirebaseMessaging.addListener('tokenReceived', (event) => callback(event.token));
  return () => handle.remove();
}

export const push = { requestPermission, getToken, onNotificationOpened, deleteToken, onTokenReceived };
export { requestPermission, getToken, onNotificationOpened, deleteToken, onTokenReceived };
