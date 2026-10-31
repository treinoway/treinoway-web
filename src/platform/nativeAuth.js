import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { NATIVE_AUTH_UNAVAILABLE } from '../constants/nativeAuth';

const APP_ID = 'br.com.teufit.coach';
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_IOS_URL_SCHEME_READY = import.meta.env.VITE_GOOGLE_IOS_URL_SCHEME_READY === 'true';

// Builds the error thrown when the client IDs of this build are missing; callers show a neutral message.
const unavailableError = (provider) => {
  const error = new Error(`Native ${provider} sign-in is not configured in this build.`);
  error.code = NATIVE_AUTH_UNAVAILABLE;
  return error;
};

let initialization = null;

// Initializes the social-login plugin once, with only the providers this platform and build can serve.
function ensureInitialized() {
  if (!initialization) {
    const google = GOOGLE_WEB_CLIENT_ID
      ? { webClientId: GOOGLE_WEB_CLIENT_ID, ...(GOOGLE_IOS_CLIENT_ID && { iOSClientId: GOOGLE_IOS_CLIENT_ID, iOSServerClientId: GOOGLE_WEB_CLIENT_ID }) }
      : undefined;
    const apple = Capacitor.getPlatform() === 'ios' ? { clientId: APP_ID } : undefined;
    initialization = SocialLogin.initialize({ google, apple }).catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

// Opens the native Google account picker and resolves the ID token the backend verifies.
async function signInWithGoogle() {
  // why: GoogleSignIn on iOS raises an uncatchable exception (app crash) when the reversed client ID is not a URL scheme in Info.plist, so iOS needs the explicit declaration that it was added.
  const iosNotReady = Capacitor.getPlatform() === 'ios' && !(GOOGLE_IOS_CLIENT_ID && GOOGLE_IOS_URL_SCHEME_READY);
  if (!GOOGLE_WEB_CLIENT_ID || iosNotReady) throw unavailableError('Google');
  await ensureInitialized();
  const { result } = await SocialLogin.login({ provider: 'google', options: {} });
  if (!result.idToken) throw unavailableError('Google');
  return { idToken: result.idToken };
}

// Opens the native Sign in with Apple sheet (iOS only) and resolves the identity token.
async function signInWithApple() {
  if (Capacitor.getPlatform() !== 'ios') throw unavailableError('Apple');
  await ensureInitialized();
  const { result } = await SocialLogin.login({ provider: 'apple', options: { scopes: ['email', 'name'] } });
  if (!result.idToken) throw unavailableError('Apple');
  return { identityToken: result.idToken };
}

export const nativeAuth = { signInWithGoogle, signInWithApple };
export { signInWithGoogle, signInWithApple };
