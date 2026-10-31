import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATED_CONFIGS = ['android/app/src/main/assets/capacitor.config.json', 'ios/App/App/capacitor.config.json'];
const ANDROID_MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const ANDROID_RES_XML = 'android/app/src/main/res/xml';
const ANDROID_GRADLE = 'android/app/build.gradle';
const IOS_PLIST = 'ios/App/App/Info.plist';

// Reads a file under the project root, or null when it does not exist.
const readIfExists = (root, relativePath) => {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null;
};

// Flags insecure settings in a generated capacitor.config.json (cleartext, http scheme, mixed content, remote debugging, http server URL).
function checkGeneratedConfig(relativePath, raw) {
  const violations = [];
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    return [`${relativePath}: not valid JSON`];
  }
  if (config.server?.cleartext === true) violations.push(`${relativePath}: server.cleartext is true`);
  if (config.server?.androidScheme === 'http') violations.push(`${relativePath}: server.androidScheme is http`);
  if (typeof config.server?.url === 'string' && config.server.url.startsWith('http://')) {
    violations.push(`${relativePath}: server.url points to cleartext HTTP (${config.server.url})`);
  }
  if (config.android?.allowMixedContent === true) violations.push(`${relativePath}: android.allowMixedContent is true`);
  if (config.android?.webContentsDebuggingEnabled === true) violations.push(`${relativePath}: android.webContentsDebuggingEnabled is true`);
  return violations;
}

// Flags cleartext traffic and debuggable builds in the Android manifest.
function checkAndroidManifest(raw) {
  const violations = [];
  if (/android:usesCleartextTraffic\s*=\s*"true"/.test(raw)) violations.push(`${ANDROID_MANIFEST}: usesCleartextTraffic is true`);
  if (/android:debuggable\s*=\s*"true"/.test(raw)) violations.push(`${ANDROID_MANIFEST}: debuggable is true`);
  return violations;
}

// Flags a release build type that does not pin usesCleartextTraffic to 'false' in app/build.gradle.
function checkAndroidGradle(raw) {
  const release = raw.match(/release\s*\{[\s\S]*?usesCleartextTraffic:\s*'(\w+)'/);
  if (!release) return [`${ANDROID_GRADLE}: the release build type must pin usesCleartextTraffic to 'false'`];
  return release[1] === 'false' ? [] : [`${ANDROID_GRADLE}: the release build type sets usesCleartextTraffic to '${release[1]}'`];
}

// Flags a network security config that permits cleartext traffic.
function checkNetworkSecurityConfigs(root) {
  const directory = join(root, ANDROID_RES_XML);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith('.xml'))
    .map((file) => ({ file, raw: readFileSync(join(directory, file), 'utf8') }))
    .filter(({ raw }) => /cleartextTrafficPermitted\s*=\s*"true"/.test(raw))
    .map(({ file }) => `${ANDROID_RES_XML}/${file}: cleartextTrafficPermitted is true`);
}

// Flags App Transport Security exceptions in the iOS Info.plist.
function checkInfoPlist(raw) {
  const insecureKeys = ['NSAllowsArbitraryLoads', 'NSAllowsArbitraryLoadsInWebContent', 'NSAllowsLocalNetworking', 'NSExceptionAllowsInsecureHTTPLoads'];
  return insecureKeys
    .filter((key) => new RegExp(`<key>${key}</key>\\s*<true\\s*/>`).test(raw))
    .map((key) => `${IOS_PLIST}: ${key} is true`);
}

// Flags a missing or non-HTTPS API base URL: a release build must not fall back to an empty or local base URL.
function checkApiBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) return ['VITE_API_BASE_URL is not set (checked in the process env, .env, .env.local, .env.app and .env.app.local)'];
  return apiBaseUrl.startsWith('https://') ? [] : [`VITE_API_BASE_URL must be an https:// URL for a release build (got "${apiBaseUrl}")`];
}

// why: matches private-network IPs and localhost WITH a port (a dev API URL); bare "http://localhost" appears as a placeholder inside libraries such as firebase.
const LOCAL_HTTP_URL = /http:\/\/(?:(?:127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?|localhost:\d+)/;

// Flags a built bundle that carries a cleartext local/LAN URL (a debug API URL baked into the release bundle).
function checkBundle(root) {
  const assets = join(root, 'dist/assets');
  if (!existsSync(assets)) return [];
  return readdirSync(assets)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => LOCAL_HTTP_URL.test(readFileSync(join(assets, file), 'utf8')))
    .map((file) => `dist/assets/${file}: contains a cleartext local/LAN URL`);
}

/**
 * Checks the native project of a release build for cleartext, mixed content, ATS exceptions and remote debugging.
 * @param {{ root: string, env?: Record<string, string | undefined> }} options project root and process env
 * @returns {string[]} the violations found; empty when the project is release-safe
 */
export function checkNativeRelease({ root, env = {} }) {
  const manifest = readIfExists(root, ANDROID_MANIFEST);
  const plist = readIfExists(root, IOS_PLIST);
  const gradle = readIfExists(root, ANDROID_GRADLE);
  const generated = GENERATED_CONFIGS.map((path) => ({ path, raw: readIfExists(root, path) })).filter(({ raw }) => raw !== null);
  const missingGenerated = generated.length === 0 ? ['no generated capacitor.config.json found: run `npx cap sync` before checking'] : [];
  return [
    ...missingGenerated,
    ...checkBundle(root),
    ...generated.flatMap(({ path, raw }) => checkGeneratedConfig(path, raw)),
    ...(manifest ? checkAndroidManifest(manifest) : []),
    ...(gradle ? checkAndroidGradle(gradle) : []),
    ...checkNetworkSecurityConfigs(root),
    ...(plist ? checkInfoPlist(plist) : []),
    ...checkApiBaseUrl(env.VITE_API_BASE_URL),
  ];
}

// Runs the check from the command line and exits non-zero on any violation.
async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { loadEnv } = await import('vite');
  // why: loadEnv reads .env, .env.local, .env.app and .env.app.local exactly like `vite build --mode app`, and process variables win.
  const env = loadEnv('app', root, 'VITE_');
  const violations = checkNativeRelease({ root, env });
  if (violations.length === 0) {
    console.log('check:native-release OK');
    return;
  }
  console.error('check:native-release failed:');
  violations.forEach((violation) => console.error(`  - ${violation}`));
  console.error('Run `npx cap sync` without CAP_DEV_* variables, then build again.');
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
