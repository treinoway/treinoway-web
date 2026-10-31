import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

let configuration = null;

// Configures the Keychain once: items readable only while unlocked, never synced to iCloud nor restored on another device.
function ensureConfigured() {
  if (!configuration) {
    configuration = Promise.all([
      SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly),
      SecureStorage.setSynchronize(false),
    ]).catch((error) => {
      configuration = null;
      throw error;
    });
  }
  return configuration;
}

// Reads a string from the Keychain/Keystore, or null when the key is absent.
async function getItem(key) {
  await ensureConfigured();
  const value = await SecureStorage.get(key);
  return typeof value === 'string' ? value : null;
}

// Writes a string to the Keychain/Keystore.
async function setItem(key, value) {
  await ensureConfigured();
  await SecureStorage.set(key, value);
}

// Removes a key from the Keychain/Keystore; a missing key is not an error.
async function removeItem(key) {
  await ensureConfigured();
  await SecureStorage.remove(key);
}

export { getItem, setItem, removeItem };
