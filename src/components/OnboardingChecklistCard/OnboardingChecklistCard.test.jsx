import { screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import OnboardingChecklistCard from './OnboardingChecklistCard';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { getOnboardingDismissKey } from '../../hooks/useOnboardingStatus';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockHasRole = vi.fn();

const baseTrainerWithOnboarding = (overrides = {}) => ({
  id: 1,
  email: 'trainer@example.com',
  roles: ['TRAINER'],
  firstName: 'Ana',
  lastName: 'Silva',
  birthDate: '1990-01-01',
  gender: 'female',
  address: {
    line1: 'Rua X, 123',
    city: 'Sao Paulo',
    state: 'SP',
    postalCode: '01000-000',
    country: 'Brasil',
  },
  trainerOnboarding: {
    profileCompleted: true,
    firstStudentLinked: false,
    firstProtocolCreated: false,
  },
  ...overrides,
});

const mockMeResponse = (data) => {
  api.get.mockImplementation((url) => {
    if (url === '/me?include=trainerOnboarding,address') {
      return Promise.resolve({ data });
    }
    return Promise.reject(new Error(`unexpected url ${url}`));
  });
};

describe('OnboardingChecklistCard', () => {
  beforeEach(() => {
    api.get.mockReset();
    sessionStorage.clear();
    localStorage.clear();
    mockHasRole.mockReset();
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    vi.mocked(useAuth).mockReturnValue({ hasRole: mockHasRole, user: { id: 1 } });
  });

  it('renders nothing when user is not a trainer', async () => {
    mockHasRole.mockReturnValue(false);
    mockMeResponse({
      id: 1,
      roles: ['STUDENT'],
      trainerOnboarding: null,
    });

    const { container } = renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    expect(container.querySelector('.onboarding-card')).not.toBeInTheDocument();
  });

  it('renders nothing when trainerOnboarding is null', async () => {
    mockMeResponse({
      id: 1,
      roles: ['TRAINER'],
      trainerOnboarding: null,
    });

    const { container } = renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    expect(container.querySelector('.onboarding-card')).not.toBeInTheDocument();
  });

  it('shows three rows for a trainer with pending steps', async () => {
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: false,
        firstStudentLinked: false,
        firstProtocolCreated: false,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();
    });

    expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
    expect(screen.getByText('Vincule seu primeiro aluno')).toBeInTheDocument();
    expect(screen.getByText('Crie sua primeira rotina')).toBeInTheDocument();
    expect(screen.getByText('0 de 4')).toBeInTheDocument();
  });

  it('shows "Falta: ..." subtitle with missing fields when profile is incomplete', async () => {
    mockMeResponse({
      id: 1,
      roles: ['TRAINER'],
      firstName: 'Ana',
      lastName: '',
      birthDate: '',
      gender: '',
      address: { line1: '', city: '', state: '', postalCode: '', country: '' },
      trainerOnboarding: {
        profileCompleted: false,
        firstStudentLinked: false,
        firstProtocolCreated: false,
      },
    });

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByText(/^Falta:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/sobrenome/)).toBeInTheDocument();
  });

  it('shows progress pill with done count', async () => {
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: true,
        firstProtocolCreated: true,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByText('3 de 4')).toBeInTheDocument();
      expect(screen.getByText('Quase lá — falta só 1!')).toBeInTheDocument();
    });
  });

  it('renders success state with dismiss button when all steps are done', async () => {
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: true,
        firstProtocolCreated: true,
        firstAnamnesisSent: true,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByText('Tudo pronto!')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    expect(screen.queryByText(/de 3$/)).not.toBeInTheDocument();
  });

  it('dismisses the card when X is clicked in the all-done state', async () => {
    const user = userEvent.setup();
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: true,
        firstProtocolCreated: true,
        firstAnamnesisSent: true,
      },
    }));

    const { container } = renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Dispensar checklist' }));

    await waitFor(() => {
      expect(container.querySelector('.onboarding-card')).not.toBeInTheDocument();
    });

    expect(localStorage.getItem(getOnboardingDismissKey(1))).toBe('1');
  });

  it('keeps the card dismissed after remounting (survives closing/reopening the tab)', async () => {
    const user = userEvent.setup();
    const allDoneOnboarding = {
      profileCompleted: true,
      firstStudentLinked: true,
      firstProtocolCreated: true,
      firstAnamnesisSent: true,
    };
    mockMeResponse(baseTrainerWithOnboarding({ trainerOnboarding: allDoneOnboarding }));

    const first = renderWithRouter(<OnboardingChecklistCard />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Dispensar checklist' }));
    await waitFor(() => {
      expect(first.container.querySelector('.onboarding-card')).not.toBeInTheDocument();
    });
    first.unmount();

    // Dismiss flag lives in localStorage — jsdom does not clear it between
    // "sessions" within the same test, simulating a closed/reopened tab.
    mockMeResponse(baseTrainerWithOnboarding({ trainerOnboarding: allDoneOnboarding }));
    const second = renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    expect(second.container.querySelector('.onboarding-card')).not.toBeInTheDocument();
  });

  it('does not share the dismissed flag between different users', async () => {
    const user = userEvent.setup();
    const allDoneOnboarding = {
      profileCompleted: true,
      firstStudentLinked: true,
      firstProtocolCreated: true,
      firstAnamnesisSent: true,
    };
    vi.mocked(useAuth).mockReturnValue({ hasRole: mockHasRole, user: { id: 1 } });
    mockMeResponse(baseTrainerWithOnboarding({ trainerOnboarding: allDoneOnboarding }));

    const first = renderWithRouter(<OnboardingChecklistCard />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Dispensar checklist' }));
    await waitFor(() => {
      expect(first.container.querySelector('.onboarding-card')).not.toBeInTheDocument();
    });
    first.unmount();

    // Switch to a different logged-in user (id 2) — their flag must be independent.
    vi.mocked(useAuth).mockReturnValue({ hasRole: mockHasRole, user: { id: 2 } });
    mockMeResponse(baseTrainerWithOnboarding({ id: 2, trainerOnboarding: allDoneOnboarding }));
    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    });
    expect(localStorage.getItem(getOnboardingDismissKey(1))).toBe('1');
    expect(localStorage.getItem(getOnboardingDismissKey(2))).toBeNull();
  });

  it('does not persist or read the dismiss flag before the user id is available', async () => {
    vi.mocked(useAuth).mockReturnValue({ hasRole: mockHasRole, user: null });
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: true,
        firstProtocolCreated: true,
        firstAnamnesisSent: true,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispensar checklist' })).toBeInTheDocument();
    });

    // No id yet — nothing should have been written under an "undefined" key.
    expect(localStorage.getItem(getOnboardingDismissKey(undefined))).toBeNull();
  });

  it('sorts pending rows before done rows', async () => {
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: false,
        firstProtocolCreated: false,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
    });

    const rowButtons = screen.getAllByRole('button');
    const titles = rowButtons
      .map((btn) => btn.textContent)
      .filter((text) => text && (
        text.includes('Complete seu perfil')
        || text.includes('Vincule seu primeiro aluno')
        || text.includes('Crie sua primeira rotina')
      ));

    expect(titles[0]).toMatch(/Vincule seu primeiro aluno|Crie sua primeira rotina/);
    expect(titles[titles.length - 1]).toMatch(/Complete seu perfil/);
  });


  it('shows skeleton while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithRouter(<OnboardingChecklistCard />);

    expect(container.querySelector('.onboarding-card--skeleton')).toBeInTheDocument();
  });

  describe('first-contact steps (criteria 4, 5, 6, 13, 16)', () => {
    const STATUS_CACHE_KEY = 'treinoway:onboardingStatus:1';
    const allPending = {
      profileCompleted: false,
      firstStudentLinked: false,
      firstProtocolCreated: false,
      firstStudentInvited: false,
      firstAnamnesisSent: false,
      brandingConfigured: false,
    };

    const LocationProbe = () => {
      const location = useLocation();
      return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
    };

    const renderCard = (route = '/') => renderWithRouter(
      <>
        <OnboardingChecklistCard />
        <LocationProbe />
      </>,
      { route },
    );

    it('shows the anamnesis step in a 4-step checklist', async () => {
      mockMeResponse(baseTrainerWithOnboarding({
        platformPlan: { tier: 'FREE', limits: { branding: false } },
        trainerOnboarding: allPending,
      }));

      renderCard();

      expect(await screen.findByText('Envie sua primeira anamnese')).toBeInTheDocument();
      expect(screen.queryByText('Configure sua marca')).not.toBeInTheDocument();
      expect(screen.getByText('0 de 4')).toBeInTheDocument();
    });

    it('never shows a branding step, even when the plan allows branding', async () => {
      mockMeResponse(baseTrainerWithOnboarding({
        platformPlan: { tier: 'PRO', limits: { branding: true } },
        trainerOnboarding: { ...allPending, brandingConfigured: true },
      }));

      renderCard();

      expect(await screen.findByText('Envie sua primeira anamnese')).toBeInTheDocument();
      expect(screen.queryByText('Configure sua marca')).not.toBeInTheDocument();
      expect(screen.getByText('0 de 4')).toBeInTheDocument();
    });

    it('links the anamnesis step to its screen', async () => {
      const user = userEvent.setup();
      mockMeResponse(baseTrainerWithOnboarding({
        trainerOnboarding: allPending,
      }));

      renderCard();

      await user.click(await screen.findByRole('button', { name: /Envie sua primeira anamnese/ }));
      expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent('/trainer/anamneses');
    });

    it('counts step 2 as done with an awaiting-student subtitle when invited but not yet linked', async () => {
      mockMeResponse(baseTrainerWithOnboarding({
        trainerOnboarding: { ...allPending, firstStudentInvited: true },
      }));

      renderCard();

      expect(await screen.findByText('Convite enviado — aguardando o aluno aceitar')).toBeInTheDocument();
      expect(screen.getByText('1 de 4')).toBeInTheDocument();
    });

    it('marks the routine step done optimistically when landing with justCompleted firstRoutine', async () => {
      mockMeResponse(baseTrainerWithOnboarding({ trainerOnboarding: allPending }));

      renderCard({ pathname: '/', state: { justCompleted: 'firstRoutine' } });

      expect(await screen.findByText('Crie sua primeira rotina')).toBeInTheDocument();
      expect(screen.getByText('1 de 4')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crie sua primeira rotina, concluído/ })).toBeInTheDocument();
    });

    it('persists the last-known status per user after a successful fetch', async () => {
      mockMeResponse(baseTrainerWithOnboarding({
        trainerOnboarding: { ...allPending, profileCompleted: true },
      }));

      renderCard();

      await screen.findByRole('heading', { name: 'Primeiros passos' });
      const cached = JSON.parse(localStorage.getItem(STATUS_CACHE_KEY));
      expect(cached.onboarding.profileCompleted).toBe(true);
      expect(cached.onboarding.firstAnamnesisSent).toBe(false);
      expect(localStorage.getItem('treinoway:onboardingStatus:2')).toBeNull();
    });

    it('does not render a skeleton while /me loads when the cached status is all done', () => {
      localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({
        onboarding: { ...allPending, profileCompleted: true, firstStudentLinked: true, firstProtocolCreated: true, firstAnamnesisSent: true },
        brandingAllowed: false,
      }));
      api.get.mockImplementation(() => new Promise(() => {}));

      renderCard();

      expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    });

    it('does not render a skeleton while /me loads when the card was dismissed', () => {
      localStorage.setItem(getOnboardingDismissKey(1), '1');
      api.get.mockImplementation(() => new Promise(() => {}));

      renderCard();

      expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    });

    it('falls back to the cached status when /me keeps failing', async () => {
      localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({
        onboarding: { ...allPending, profileCompleted: true },
        brandingAllowed: false,
      }));
      api.get.mockRejectedValue(new Error('network'));

      renderCard();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(3);
      }, { timeout: 6000 });
      expect(await screen.findByText('1 de 4')).toBeInTheDocument();
    }, 10000);

    it('renders nothing (no "0 de N") when /me keeps failing and there is no cache', async () => {
      api.get.mockRejectedValue(new Error('network'));

      renderCard();

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(3);
      }, { timeout: 6000 });
      await waitFor(() => {
        expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
      });
      expect(screen.queryByRole('heading', { name: 'Primeiros passos' })).not.toBeInTheDocument();
      expect(screen.queryByText(/^0 de \d$/)).not.toBeInTheDocument();
    }, 10000);
  });
});
