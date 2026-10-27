import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AiRouteGuard from './AiRouteGuard';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// Builds a trainer user with the given AI quota.
const trainerWithLimit = (aiActionsPerStudent) => ({
  id: 'trainer-1',
  platformPlan: { tier: 'X', limits: { aiActionsPerStudent } },
});

// Mocks useAuth for the given user and roles.
const mockAuth = ({ user, roles = ['TRAINER'] }) => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    isAuthenticated: Boolean(user),
    hasRole: (role) => roles.includes(role),
  });
};

// Renders the guarded AI route at its URL.
const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/ai-assistant']}>
      <Routes>
        <Route path="/" element={<div>Dashboard Page</div>} />
        <Route
          path="/trainer/ai-assistant"
          element={
            <AiRouteGuard>
              <div>iArnold Page</div>
            </AiRouteGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('AiRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects a FREE trainer (aiActionsPerStudent === 0) to the dashboard', () => {
    mockAuth({ user: trainerWithLimit(0) });

    renderAt();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('iArnold Page')).not.toBeInTheDocument();
  });

  it('renders the page for a PRO trainer (limit > 0)', () => {
    mockAuth({ user: trainerWithLimit(3) });

    renderAt();

    expect(screen.getByText('iArnold Page')).toBeInTheDocument();
  });

  it('renders the page for a DIAMOND trainer (null = unlimited)', () => {
    mockAuth({ user: trainerWithLimit(null) });

    renderAt();

    expect(screen.getByText('iArnold Page')).toBeInTheDocument();
  });

  it('redirects a user without the TRAINER role, even when the plan allows AI', () => {
    mockAuth({ user: trainerWithLimit(3), roles: ['STUDENT'] });

    renderAt();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('iArnold Page')).not.toBeInTheDocument();
  });

  it('redirects when there is no user', () => {
    mockAuth({ user: null, roles: [] });

    renderAt();

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('keeps the fail-open semantics of useAiAccess when plan data is missing for a trainer', () => {
    mockAuth({ user: { id: 'trainer-1' } });

    renderAt();

    expect(screen.getByText('iArnold Page')).toBeInTheDocument();
  });
});
