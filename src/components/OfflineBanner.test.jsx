import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '../test/test-utils';
import OfflineBanner from './OfflineBanner';

// Fakes navigator.onLine.
const setNavigatorOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
};

describe('OfflineBanner', () => {
  afterEach(() => setNavigatorOnline(true));

  it('renders nothing while online', () => {
    setNavigatorOnline(true);

    render(<OfflineBanner />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the no-connection notice while offline and hides it when back online', () => {
    setNavigatorOnline(false);
    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/sem conexão/i);
    act(() => { window.dispatchEvent(new Event('online')); });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
