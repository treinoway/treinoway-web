import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, render } from '../test/test-utils';
import TrainerOnlyGate from './TrainerOnlyGate';
import { useAuth } from '../contexts/AuthContext';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const logout = vi.fn();

// Mocks a signed-in user holding exactly these roles.
const setRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', roles },
    hasRole: (role) => roles.some((r) => r.toUpperCase() === role.toUpperCase()),
    logout,
  });
};

// Renders the gate around a sentinel child.
const renderGate = () => render(
  <TrainerOnlyGate>
    <p>Painel do treinador</p>
  </TrainerOnlyGate>,
);

describe('TrainerOnlyGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
  });

  it('tells a student-only account in the app that it is for trainers', () => {
    setRoles(['STUDENT']);

    renderGate();

    expect(screen.getByText(/treinadores/i)).toBeInTheDocument();
    expect(screen.queryByText('Painel do treinador')).not.toBeInTheDocument();
  });

  it('lets that account sign out', async () => {
    const user = userEvent.setup();
    setRoles(['STUDENT']);

    renderGate();
    await user.click(screen.getByRole('button', { name: /sair/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('shows the notice to an account without any role', () => {
    setRoles([]);

    renderGate();

    expect(screen.getByText(/treinadores/i)).toBeInTheDocument();
  });

  it('lets a trainer through', () => {
    setRoles(['TRAINER']);

    renderGate();

    expect(screen.getByText('Painel do treinador')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
  });

  it('lets a trainer who is also a student enter as a trainer', () => {
    setRoles(['STUDENT', 'TRAINER']);

    renderGate();

    expect(screen.getByText('Painel do treinador')).toBeInTheDocument();
    expect(screen.queryByText(/treinadores/i)).not.toBeInTheDocument();
  });

  it('does not change the website: a student-only account still gets the children', () => {
    platform.isNative.mockReturnValue(false);
    setRoles(['STUDENT']);

    renderGate();

    expect(screen.getByText('Painel do treinador')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sair/i })).not.toBeInTheDocument();
  });
});
