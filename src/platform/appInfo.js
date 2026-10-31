import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Resolves { appId, platform, version } of the running native app.
export async function getAppInfo() {
  const info = await App.getInfo();
  return { appId: info.id, platform: Capacitor.getPlatform(), version: info.version };
}
