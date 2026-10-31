import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import NativeBootGate from './NativeBootGate';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('NativeBootGate', () => {
  it('shows the loading screen, not the app, while the native session is restored', () => {
    vi.mocked(useAuth).mockReturnValue({ isRestoring: true });

    render(<NativeBootGate><p>App</p></NativeBootGate>);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
    expect(screen.queryByText('App')).not.toBeInTheDocument();
  });

  it('renders the app once the session was restored', () => {
    vi.mocked(useAuth).mockReturnValue({ isRestoring: false });

    render(<NativeBootGate><p>App</p></NativeBootGate>);

    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('renders the app on the website, where the flag is absent', () => {
    vi.mocked(useAuth).mockReturnValue({});

    render(<NativeBootGate><p>App</p></NativeBootGate>);

    expect(screen.getByText('App')).toBeInTheDocument();
  });
});
