import { App } from '@capacitor/app';

// Calls the callback whenever the app goes to the background; resolves a disposer.
export async function onAppBackground(callback) {
  const handle = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) callback();
  });
  return () => handle.remove();
}
