import { Browser } from '@capacitor/browser';

// Opens a URL in the system browser (SFSafariViewController / Custom Tabs) instead of the app WebView.
export async function openExternalUrl(url) {
  await Browser.open({ url });
}
