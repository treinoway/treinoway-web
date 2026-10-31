import type { CapacitorConfig } from '@capacitor/cli';

// Debug-only switches. Release builds never set these, so the secure defaults hold: HTTPS only, no remote debugging.
const devLanHttp = process.env.CAP_DEV_ALLOW_LAN_HTTP === 'true';
const devWebDebug = process.env.CAP_DEV_WEB_DEBUGGING === 'true';

const config: CapacitorConfig = {
  appId: 'br.com.teufit.coach',
  appName: 'Teufit Coach',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: devWebDebug,
  },
  server: {
    androidScheme: devLanHttp ? 'http' : 'https',
    cleartext: devLanHttp,
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false },
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': { symlink: true },
        },
      },
    },
  },
};

export default config;
