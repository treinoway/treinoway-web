import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import NativeIntegrations from './NativeIntegrations';

// Hoisted so the vi.mock factories below can reference these fakes.
const hooks = vi.hoisted(() => ({
  usePushRegistration: vi.fn(),
  usePushTokenSync: vi.fn(),
  useBackButton: vi.fn(),
  useExternalLinks: vi.fn(),
  useKeyboardAvoidance: vi.fn(),
}));
// Hoisted so the vi.mock factories below can reference this fake.
const platform = vi.hoisted(() => ({ isNative: vi.fn() }));

vi.mock('../hooks/usePushRegistration', () => ({ default: hooks.usePushRegistration }));
vi.mock('../hooks/usePushTokenSync', () => ({ default: hooks.usePushTokenSync }));
vi.mock('../hooks/useBackButton', () => ({ default: hooks.useBackButton }));
vi.mock('../hooks/useExternalLinks', () => ({ default: hooks.useExternalLinks }));
vi.mock('../hooks/useKeyboardAvoidance', () => ({ default: hooks.useKeyboardAvoidance }));
vi.mock('../platform', () => platform);

// Fakes navigator.onLine.
const setNavigatorOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
};

describe('NativeIntegrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => setNavigatorOnline(true));

  it('mounts every native behavior and shows the offline notice in the native app', () => {
    platform.isNative.mockReturnValue(true);
    setNavigatorOnline(false);

    render(<NativeIntegrations />);

    Object.values(hooks).forEach((hook) => expect(hook).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent(/sem conexão/i);
  });

  it('shows no notice on the website, even offline', () => {
    platform.isNative.mockReturnValue(false);
    setNavigatorOnline(false);

    render(<NativeIntegrations />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
