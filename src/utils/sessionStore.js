import { isNative, secureStorage } from '../platform';
import { SECURE_SESSION_KEYS } from '../constants/nativeAuth';

let nativeCache = null;
let nativeLoad = null;
let nativeReadFailed = false;
let generation = 0;

// Returns the current session generation; it changes whenever a session starts or ends.
export function currentSessionGeneration() {
  return generation;
}

// Starts a new generation, invalidating any refresh still in flight for the previous session.
export function bumpSessionGeneration() {
  generation += 1;
  return generation;
}

// Tells whether the last secure-store read failed (locked Keychain, plugin error): an empty session then is not proof the user signed out.
export function didSecureReadFail() {
  return nativeReadFailed;
}

// Reads a key from localStorage, tolerating blocked storage.
const readLocal = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Reads one key from the secure store; a failing read counts as absent.
const readSecure = (key) => Promise.resolve().then(() => secureStorage.getItem(key)).catch(() => {
  nativeReadFailed = true;
  return null;
});

// Reads the three session keys from the Keychain/Keystore into the in-memory cache; reuses the pending read unless forced.
const loadNative = (force = false) => {
  if (force || !nativeLoad) {
    nativeReadFailed = false;
    nativeLoad = Promise.all(SECURE_SESSION_KEYS.map(readSecure))
      .then((values) => {
        nativeCache = Object.fromEntries(SECURE_SESSION_KEYS.map((key, index) => [key, values[index]]));
        return nativeCache;
      });
  }
  return nativeLoad;
};

// Parses the stored user JSON, or null when absent or corrupt.
const parseUser = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Resolves once the native secure store was read; resolves immediately on the website.
export async function whenSessionReady() {
  if (isNative()) await loadNative();
}

// Reads the stored session synchronously on the website; native callers must use restoreStoredSession.
export function readWebSession() {
  return { accessToken: readLocal('accessToken'), refreshToken: readLocal('refreshToken'), user: parseUser(readLocal('user')) };
}

// Restores the stored session at boot: re-reads the secure store in the native app, localStorage on the website.
export async function restoreStoredSession() {
  if (!isNative()) return readWebSession();
  const stored = await loadNative(true);
  return { accessToken: stored.accessToken, refreshToken: stored.refreshToken, user: parseUser(stored.user) };
}

// Reads one session value synchronously; in the native app only valid after whenSessionReady.
export function readSessionValue(key) {
  if (isNative()) return nativeCache?.[key] ?? null;
  return readLocal(key);
}

// Persists one session value (string); with an expected generation it is dropped (returns false) when the session changed meanwhile.
export async function writeSessionValue(key, value, expectedGeneration) {
  if (expectedGeneration !== undefined && expectedGeneration !== generation) return false;
  if (!isNative()) {
    localStorage.setItem(key, value);
    return true;
  }
  await loadNative();
  if (expectedGeneration !== undefined && expectedGeneration !== generation) return false;
  nativeCache = { ...nativeCache, [key]: value };
  await secureStorage.setItem(key, value);
  return true;
}

// Removes the whole stored session.
export async function clearStoredSession() {
  bumpSessionGeneration();
  if (!isNative()) {
    SECURE_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    return;
  }
  await loadNative();
  nativeCache = Object.fromEntries(SECURE_SESSION_KEYS.map((key) => [key, null]));
  await Promise.all(SECURE_SESSION_KEYS.map((key) => secureStorage.removeItem(key)));
}
