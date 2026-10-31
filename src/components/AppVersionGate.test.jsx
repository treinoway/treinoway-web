import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '../test/test-utils';
import AppVersionGate from './AppVersionGate';
import api from '../api/axios';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({
  isNative: vi.fn(),
  getPlatform: vi.fn(),
  getAppInfo: vi.fn(),
}));

vi.mock('../platform', () => platform);
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));

const STORE_URL = 'https://play.google.com/store/apps/details?id=br.com.teufit.coach';

// Renders the gate around a sentinel child.
const renderGate = () => render(
  <AppVersionGate>
    <p>Painel do treinador</p>
  </AppVersionGate>,
);

// Sets the running app version and the minimum the backend reports.
const setVersions = ({ current, min }) => {
  platform.getAppInfo.mockResolvedValue({ appId: 'br.com.teufit.coach', platform: 'android', version: current });
  api.get.mockResolvedValue({ data: { minVersion: min, storeUrl: STORE_URL } });
};

describe('AppVersionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
  });

  it('asks the backend for the minimum version of this app and platform', async () => {
    setVersions({ current: '1.0.0', min: '1.0.0' });

    renderGate();

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/app/min-version', {
      params: { appId: 'br.com.teufit.coach', platform: 'android' },
    }));
  });

  it('blocks the app and links to the store when the version is below the minimum', async () => {
    setVersions({ current: '1.2.0', min: '1.3.0' });

    renderGate();

    const storeLink = await screen.findByRole('link', { name: /atualizar/i });
    expect(storeLink).toHaveAttribute('href', STORE_URL);
    expect(screen.queryByText('Painel do treinador')).not.toBeInTheDocument();
  });

  it('compares versions numerically, so 1.9.0 is below 1.10.0', async () => {
    setVersions({ current: '1.9.0', min: '1.10.0' });

    renderGate();

    expect(await screen.findByRole('link', { name: /atualizar/i })).toBeInTheDocument();
    expect(screen.queryByText('Painel do treinador')).not.toBeInTheDocument();
  });

  it('lets the app through when the version equals the minimum', async () => {
    setVersions({ current: '1.3.0', min: '1.3.0' });

    renderGate();

    expect(await screen.findByText('Painel do treinador')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /atualizar/i })).not.toBeInTheDocument();
  });

  it('lets the app through when the version is above the minimum', async () => {
    setVersions({ current: '2.0.0', min: '1.3.0' });

    renderGate();

    expect(await screen.findByText('Painel do treinador')).toBeInTheDocument();
  });

  it('does not block when the version check fails', async () => {
    platform.getAppInfo.mockResolvedValue({ appId: 'br.com.teufit.coach', platform: 'android', version: '1.0.0' });
    api.get.mockRejectedValue(new Error('Network Error'));

    renderGate();

    expect(await screen.findByText('Painel do treinador')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /atualizar/i })).not.toBeInTheDocument();
  });

  it('does not block when the response has no minimum version', async () => {
    platform.getAppInfo.mockResolvedValue({ appId: 'br.com.teufit.coach', platform: 'android', version: '1.0.0' });
    api.get.mockResolvedValue({ data: {} });

    renderGate();

    expect(await screen.findByText('Painel do treinador')).toBeInTheDocument();
  });

  it('renders the app untouched on the website, without calling the backend', () => {
    platform.isNative.mockReturnValue(false);

    renderGate();

    expect(screen.getByText('Painel do treinador')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
