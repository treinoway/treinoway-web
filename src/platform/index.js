import { Capacitor } from '@capacitor/core';

// Tells whether the app runs inside the native Capacitor shell (false on the website).
export const isNative = () => Capacitor.isNativePlatform();

// Returns the platform name: 'web', 'ios' or 'android'.
export const getPlatform = () => Capacitor.getPlatform();

const ADAPTER_LOADERS = {
  secureStorage: () => import('./secureStorage'),
  nativeAuth: () => import('./nativeAuth'),
  push: () => import('./push'),
  appInfo: () => import('./appInfo'),
  backButton: () => import('./backButton'),
  externalLinks: () => import('./externalLinks'),
  lifecycle: () => import('./lifecycle'),
  keyboard: () => import('./keyboard'),
};

// Builds an async proxy to one function of an adapter module, which only loads on first use (keeps plugins off the website's path).
const lazyCall = (adapter, functionName) => async (...args) => (await ADAPTER_LOADERS[adapter]())[functionName](...args);

// Builds an object of lazy proxies for several functions of one adapter module.
const lazyNamespace = (adapter, functionNames) => Object.fromEntries(functionNames.map((name) => [name, lazyCall(adapter, name)]));

export const secureStorage = lazyNamespace('secureStorage', ['getItem', 'setItem', 'removeItem']);
export const nativeAuth = lazyNamespace('nativeAuth', ['signInWithGoogle', 'signInWithApple']);
export const push = lazyNamespace('push', ['requestPermission', 'getToken', 'onNotificationOpened', 'deleteToken', 'onTokenReceived']);
export const getAppInfo = lazyCall('appInfo', 'getAppInfo');
export const registerBackButton = lazyCall('backButton', 'registerBackButton');
export const openExternalUrl = lazyCall('externalLinks', 'openExternalUrl');
export const onAppBackground = lazyCall('lifecycle', 'onAppBackground');
export const onKeyboardVisibility = lazyCall('keyboard', 'onKeyboardVisibility');
