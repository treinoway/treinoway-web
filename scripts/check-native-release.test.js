import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkNativeRelease } from './check-native-release.mjs';

const SECURE_CONFIG = { appId: 'br.com.teufit.coach', server: { androidScheme: 'https', cleartext: false }, android: { allowMixedContent: false } };
const SECURE_MANIFEST = '<manifest><application android:allowBackup="true"></application></manifest>';
const SECURE_GRADLE = "android { buildTypes { debug { manifestPlaceholders = [usesCleartextTraffic: 'false'] } release { manifestPlaceholders = [usesCleartextTraffic: 'false'] } } }";
const SECURE_PLIST = '<plist><dict><key>CFBundleName</key><string>Teufit Coach</string></dict></plist>';

let root;

// Writes a file below the temporary project root.
const write = (relativePath, content) => {
  const fullPath = join(root, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
};

// Writes a release-safe native project, with optional overrides per file.
const writeProject = ({ androidConfig = SECURE_CONFIG, iosConfig = SECURE_CONFIG, manifest = SECURE_MANIFEST, plist = SECURE_PLIST, gradle = SECURE_GRADLE } = {}) => {
  write('android/app/src/main/assets/capacitor.config.json', JSON.stringify(androidConfig));
  write('ios/App/App/capacitor.config.json', JSON.stringify(iosConfig));
  write('android/app/src/main/AndroidManifest.xml', manifest);
  write('ios/App/App/Info.plist', plist);
  write('android/app/build.gradle', gradle);
};

describe('checkNativeRelease', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'native-release-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('accepts a release-safe project', () => {
    writeProject();

    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } })).toEqual([]);
  });

  it.each([
    ['cleartext in the generated config', { androidConfig: { ...SECURE_CONFIG, server: { cleartext: true } } }, /cleartext is true/],
    ['an http androidScheme', { iosConfig: { ...SECURE_CONFIG, server: { androidScheme: 'http' } } }, /androidScheme is http/],
    ['a cleartext server url', { androidConfig: { ...SECURE_CONFIG, server: { url: 'http://192.168.1.20:5173' } } }, /server\.url/],
    ['mixed content', { androidConfig: { android: { allowMixedContent: true } } }, /allowMixedContent/],
    ['remote web debugging', { androidConfig: { android: { webContentsDebuggingEnabled: true } } }, /webContentsDebuggingEnabled/],
    ['usesCleartextTraffic in the manifest', { manifest: '<application android:usesCleartextTraffic="true"/>' }, /usesCleartextTraffic/],
    ['a debuggable manifest', { manifest: '<application android:debuggable="true"/>' }, /debuggable/],
    ['a release build type that allows cleartext', { gradle: "release { manifestPlaceholders = [usesCleartextTraffic: 'true'] }" }, /release build type sets usesCleartextTraffic to 'true'/],
    ['a release build type that does not pin cleartext', { gradle: 'android { buildTypes { release { minifyEnabled false } } }' }, /must pin usesCleartextTraffic/],
    ['NSAllowsArbitraryLoads', { plist: '<key>NSAllowsArbitraryLoads</key>\n  <true/>' }, /NSAllowsArbitraryLoads is true/],
    ['an ATS web content exception', { plist: '<key>NSAllowsArbitraryLoadsInWebContent</key><true/>' }, /NSAllowsArbitraryLoadsInWebContent/],
  ])('fails on %s', (name, overrides, pattern) => {
    writeProject(overrides);

    const violations = checkNativeRelease({ root });

    expect(violations.join('\n')).toMatch(pattern);
  });

  it('fails on a network security config that permits cleartext', () => {
    writeProject();
    write('android/app/src/main/res/xml/network_security_config.xml', '<base-config cleartextTrafficPermitted="true"/>');

    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://a.b' } }).join('\n')).toMatch(/cleartextTrafficPermitted/);
  });

  it('fails on a non-HTTPS API base URL and accepts HTTPS', () => {
    writeProject();

    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'http://192.168.1.20:3000' } }).join('\n')).toMatch(/https/);
    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } })).toEqual([]);
  });

  it('requires VITE_API_BASE_URL to be set (a missing or empty one is a release failure)', () => {
    writeProject();

    expect(checkNativeRelease({ root, env: {} }).join('\n')).toMatch(/VITE_API_BASE_URL is not set/);
    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: '' } }).join('\n')).toMatch(/VITE_API_BASE_URL is not set/);
  });

  it('fails when the project was never synced (no generated config to check)', () => {
    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } }).join('\n')).toMatch(/cap sync/);
  });

  it('fails when the built bundle carries a cleartext LAN URL', () => {
    writeProject();
    write('dist/assets/index-abc.js', 'const a="http://192.168.1.20:3000";');

    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } }).join('\n')).toMatch(/cleartext local\/LAN URL/);
  });

  it('fails on localhost with a port (the dev API URL) but not on the bare placeholder libraries ship', () => {
    writeProject();
    write('dist/assets/index-abc.js', 'const a="http://localhost";');
    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } })).toEqual([]);

    write('dist/assets/index-def.js', 'const a="http://localhost:3000";');
    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } }).join('\n')).toMatch(/cleartext local\/LAN URL/);
  });

  it('accepts a bundle without local URLs', () => {
    writeProject();
    write('dist/assets/index-abc.js', 'const a="https://api.teufit.com.br"; const w="http://www.w3.org/2000/svg";');

    expect(checkNativeRelease({ root, env: { VITE_API_BASE_URL: 'https://api.teufit.com.br' } })).toEqual([]);
  });
});
