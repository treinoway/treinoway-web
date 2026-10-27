import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import OnboardingChecklistCard from '../components/OnboardingChecklistCard/OnboardingChecklistCard';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { getOnboardingDismissKey } from './useOnboardingStatus';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Builds a trainer /me payload with the given onboarding flags.
const meWith = (trainerOnboarding) => ({
  id: 1,
  roles: ['TRAINER'],
  firstName: 'Ana',
  lastName: 'Silva',
  avatarUrl: 'https://cdn.example.com/ana.png',
  trainerOnboarding,
});

const LEGACY_DONE = { profileCompleted: true, firstStudentLinked: true, firstProtocolCreated: true };

// Makes every /me request resolve with the payload.
const mockMe = (data) => {
  api.get.mockImplementation(() => Promise.resolve({ data }));
};

// Seeds a stored dismissal, optionally with the steps done at that moment.
const dismiss = (stepsDoneAtDismissal) => {
  localStorage.setItem(getOnboardingDismissKey(1), '1');
  if (stepsDoneAtDismissal) {
    localStorage.setItem(`${getOnboardingDismissKey(1)}:steps`, JSON.stringify(stepsDoneAtDismissal));
  }
};

// Resolves once the status fetch was issued.
const settled = () => waitFor(() => expect(api.get).toHaveBeenCalled());

describe('onboarding checklist dismissal', () => {
  beforeEach(() => {
    api.get.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ hasRole: (role) => role === 'TRAINER', user: { id: 1 } });
  });

  it('stays hidden when a step added after the dismissal is pending', async () => {
    dismiss(['profileCompleted', 'firstStudentLinked', 'firstProtocolCreated']);
    mockMe(meWith({ ...LEGACY_DONE, firstAnamnesisSent: false }));

    renderWithRouter(<OnboardingChecklistCard />);
    await settled();

    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    expect(localStorage.getItem(getOnboardingDismissKey(1))).toBe('1');
  });

  it('brings the card back when a step that was done at dismissal is no longer done', async () => {
    dismiss(['profileCompleted', 'firstStudentLinked', 'firstProtocolCreated']);
    mockMe(meWith({ ...LEGACY_DONE, profileCompleted: false }));

    renderWithRouter(<OnboardingChecklistCard />);

    expect(await screen.findByRole('region', { name: 'Primeiros passos' })).toBeInTheDocument();
    expect(localStorage.getItem(getOnboardingDismissKey(1))).toBeNull();
  });

  it('without a stored snapshot, uses the cached status as the baseline for regressions', async () => {
    dismiss(null);
    localStorage.setItem('treinoway:onboardingStatus:1', JSON.stringify({
      onboarding: LEGACY_DONE,
      brandingAllowed: false,
    }));
    mockMe(meWith({ ...LEGACY_DONE, firstProtocolCreated: false }));

    renderWithRouter(<OnboardingChecklistCard />);

    expect(await screen.findByRole('region', { name: 'Primeiros passos' })).toBeInTheDocument();
  });

  it('without a snapshot or a cache, stays hidden', async () => {
    dismiss(null);
    mockMe(meWith({ ...LEGACY_DONE, firstProtocolCreated: false }));

    renderWithRouter(<OnboardingChecklistCard />);
    await settled();

    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
  });
});
