import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import OnboardingChecklistCard from './OnboardingChecklistCard';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

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
    mockHasRole.mockReset();
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    vi.mocked(useAuth).mockReturnValue({ hasRole: mockHasRole });
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
    expect(screen.getByText('Crie seu primeiro protocolo')).toBeInTheDocument();
    expect(screen.getByText('0 de 3')).toBeInTheDocument();
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
        firstProtocolCreated: false,
      },
    }));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(screen.getByText('2 de 3')).toBeInTheDocument();
    });

    expect(screen.getByText('Quase lá — falta só 1!')).toBeInTheDocument();
  });

  it('renders success state with dismiss button when all steps are done', async () => {
    mockMeResponse(baseTrainerWithOnboarding({
      trainerOnboarding: {
        profileCompleted: true,
        firstStudentLinked: true,
        firstProtocolCreated: true,
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

    expect(sessionStorage.getItem('treinoway:onboardingDismissed')).toBe('1');
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
        || text.includes('Crie seu primeiro protocolo')
      ));

    expect(titles[0]).toMatch(/Vincule seu primeiro aluno|Crie seu primeiro protocolo/);
    expect(titles[titles.length - 1]).toMatch(/Complete seu perfil/);
  });

  it('renders all-pending when /me fetch keeps failing (trainer known from auth)', async () => {
    api.get.mockRejectedValue(new Error('network'));

    renderWithRouter(<OnboardingChecklistCard />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(3);
    }, { timeout: 6000 });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();
    });

    expect(screen.getByText('Adicione seus dados pessoais e endereço')).toBeInTheDocument();
    expect(screen.getByText('0 de 3')).toBeInTheDocument();
  }, 10000);

  it('shows skeleton while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithRouter(<OnboardingChecklistCard />);

    expect(container.querySelector('.onboarding-card--skeleton')).toBeInTheDocument();
  });
});
