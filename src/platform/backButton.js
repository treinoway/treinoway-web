import { App } from '@capacitor/app';

// Wires the Android back button: goes back while there is history, otherwise minimizes; resolves a disposer.
export async function registerBackButton({ goBack, canGoBack }) {
  const handle = await App.addListener('backButton', () => {
    if (canGoBack()) {
      goBack();
      return;
    }
    App.minimizeApp();
  });
  return () => handle.remove();
}
