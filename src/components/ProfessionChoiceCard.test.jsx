import userEvent from '@testing-library/user-event';
import { render, renderWithRouter, screen, waitFor } from '../test/test-utils';
import ProfessionChoiceCard from './ProfessionChoiceCard';
import Toggle from './ds/Toggle';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();
const mockShowToast = vi.fn();

const TRAINER_TOKENS = { token: { accessToken: 'trainer-access' }, refreshToken: 'trainer-refresh' };
const NUTRITIONIST_TOKENS = { token: { accessToken: 'nutri-access' }, refreshToken: 'nutri-refresh' };
const REMOVED_STUDENT_EXIT_TEXT = 'O TeuFit para alunos fica no app. Baixe na App Store ou no Google Play.';
const APP_STORE_HOSTS = ['apps.apple.com', 'play.google.com'];

// Reads the classes the DS Toggle renders for the given state.
const dsToggleClasses = (checked) => {
  const { container, unmount } = render(<Toggle checked={checked} onChange={() => {}} label="Referência" />);
  const classes = container.firstChild.className.split(' ');
  unmount();
  return classes;
};

// Answers each become-* PATCH with its own token pair.
const resolveBecomeCalls = () => {
  vi.mocked(api.patch).mockImplementation((url) => {
    if (url === '/become-trainer') return Promise.resolve({ data: TRAINER_TOKENS });
    if (url === '/become-nutritionist') return Promise.resolve({ data: NUTRITIONIST_TOKENS });
    return Promise.reject(new Error(`unexpected PATCH ${url}`));
  });
};

// Lists the URLs PATCHed so far, in order.
const patchedUrls = () => vi.mocked(api.patch).mock.calls.map(([url]) => url);

// Renders the card inside a router.
const renderCard = () => renderWithRouter(<ProfessionChoiceCard />);

// Returns the two profession switches.
const getSwitches = () => ({
  training: screen.getByRole('switch', { name: 'Treino' }),
  nutrition: screen.getByRole('switch', { name: 'Nutrição' }),
});

// Lists the visible text of every button on screen, in order.
const buttonNames = () => screen.getAllByRole('button').map((button) => button.textContent);

// Lists the links on screen whose href points to the App Store or to Google Play.
const appStoreLinks = () => screen.queryAllByRole('link')
  .filter((link) => APP_STORE_HOSTS.some((host) => (link.getAttribute('href') || '').includes(host)));

// Asserts the removed student-exit message, store names and store links are all absent.
const expectNoAppStoreContent = () => {
  expect(screen.queryByText(REMOVED_STUDENT_EXIT_TEXT)).not.toBeInTheDocument();
  expect(screen.queryByText(/app store|google play/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Abrir na App Store' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Abrir no Google Play' })).not.toBeInTheDocument();
  expect(appStoreLinks()).toEqual([]);
};

describe('ProfessionChoiceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockReset();
    resolveBecomeCalls();
    mockRefreshUser.mockResolvedValue({ id: 'user-1', roles: ['TRAINER'] });
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', firstName: 'Ana', email: 'ana@example.com', roles: [] },
      isAuthenticated: true,
      hasRole: () => false,
      updateTokens: mockUpdateTokens,
      refreshUser: mockRefreshUser,
      updateUser: vi.fn(),
    });
  });

  describe('layout', () => {
    it('renders the heading, helper, both switches with their descriptions and the continue button', () => {
      renderCard();

      expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
      expect(screen.getByText('Marque um ou os dois. Você pode mudar depois.')).toBeInTheDocument();
      const { training, nutrition } = getSwitches();
      expect(training).toHaveAccessibleDescription('Crio rotinas para alunos');
      expect(nutrition).toHaveAccessibleDescription('Crio planos alimentares para pacientes');
      expect(screen.getByText('Crio rotinas para alunos')).toBeVisible();
      expect(screen.getByText('Crio planos alimentares para pacientes')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    });

    it('renders both switches with the DS Toggle markup, off by default', () => {
      renderCard();

      const { training, nutrition } = getSwitches();
      const offClasses = dsToggleClasses(false);
      expect(training).toHaveClass(...offClasses);
      expect(nutrition).toHaveClass(...offClasses);
      expect(training).not.toHaveClass('toggle--on');
      expect(nutrition).not.toHaveClass('toggle--on');
      expect(training).toHaveAttribute('aria-checked', 'false');
      expect(nutrition).toHaveAttribute('aria-checked', 'false');
    });

    it('renders "Continuar" as a DS primary button, disabled while no switch is on', () => {
      renderCard();

      const continueButton = screen.getByRole('button', { name: 'Continuar' });
      expect(continueButton).toHaveClass('btn', 'btn--primary');
      expect(continueButton).toBeDisabled();
    });
  });

  describe('switches', () => {
    it('toggles each switch independently', async () => {
      const user = userEvent.setup();
      renderCard();
      const { training, nutrition } = getSwitches();

      await user.click(training);
      expect(training).toHaveAttribute('aria-checked', 'true');
      expect(training).toHaveClass(...dsToggleClasses(true));
      expect(nutrition).toHaveAttribute('aria-checked', 'false');

      await user.click(nutrition);
      expect(training).toHaveAttribute('aria-checked', 'true');
      expect(nutrition).toHaveAttribute('aria-checked', 'true');

      await user.click(training);
      expect(training).toHaveAttribute('aria-checked', 'false');
      expect(nutrition).toHaveAttribute('aria-checked', 'true');
    });

    it('enables "Continuar" with one switch on and disables it again when all are off', async () => {
      const user = userEvent.setup();
      renderCard();
      const { nutrition } = getSwitches();

      await user.click(nutrition);
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();

      await user.click(nutrition);
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    });
  });

  describe('continue', () => {
    it('calls only PATCH /become-trainer when only "Treino" is on, then refreshes tokens and user', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
      expect(patchedUrls()).toEqual(['/become-trainer']);
      expect(mockUpdateTokens).toHaveBeenCalledTimes(1);
      expect(mockUpdateTokens).toHaveBeenCalledWith('trainer-access', 'trainer-refresh');
      expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
    });

    it('calls only PATCH /become-nutritionist when only "Nutrição" is on, then refreshes tokens and user', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().nutrition);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
      expect(patchedUrls()).toEqual(['/become-nutritionist']);
      expect(mockUpdateTokens).toHaveBeenCalledTimes(1);
      expect(mockUpdateTokens).toHaveBeenCalledWith('nutri-access', 'nutri-refresh');
    });

    it('calls both endpoints when both switches are on and ends with the tokens of the last call', async () => {
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(getSwitches().nutrition);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
      expect(patchedUrls()).toEqual(['/become-trainer', '/become-nutritionist']);
      expect(mockUpdateTokens).toHaveBeenNthCalledWith(1, 'trainer-access', 'trainer-refresh');
      expect(mockUpdateTokens).toHaveBeenLastCalledWith('nutri-access', 'nutri-refresh');
    });

    it('sends the second call only after the first one answered and its tokens were stored', async () => {
      let resolveTrainer;
      vi.mocked(api.patch).mockImplementation((url) => {
        if (url === '/become-trainer') return new Promise((resolve) => { resolveTrainer = resolve; });
        return Promise.resolve({ data: NUTRITIONIST_TOKENS });
      });
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(getSwitches().nutrition);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => expect(patchedUrls()).toEqual(['/become-trainer']));
      expect(mockUpdateTokens).not.toHaveBeenCalled();

      resolveTrainer({ data: TRAINER_TOKENS });

      await waitFor(() => expect(patchedUrls()).toEqual(['/become-trainer', '/become-nutritionist']));
      expect(mockUpdateTokens.mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(api.patch).mock.invocationCallOrder[1]);
    });

    it('shows "Carregando..." and blocks the controls while the request is pending', async () => {
      vi.mocked(api.patch).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      expect(await screen.findByRole('button', { name: 'Carregando...' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
      expect(patchedUrls()).toEqual(['/become-trainer']);
    });

    it('shows error.userMessage in an error toast and stays on screen when the call fails', async () => {
      vi.mocked(api.patch).mockRejectedValue({ userMessage: 'Não foi possível ativar seu perfil.' });
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Não foi possível ativar seu perfil.', 'error');
      });
      expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Continuar' })).toBeEnabled();
      expect(getSwitches().training).toHaveAttribute('aria-checked', 'true');
      expect(mockUpdateTokens).not.toHaveBeenCalled();
    });
  });

  describe('no student exit', () => {
    it('renders no "Sou aluno" control or text', () => {
      renderCard();

      expect(screen.queryByRole('button', { name: 'Sou aluno' })).not.toBeInTheDocument();
      expect(screen.queryByText('Sou aluno')).not.toBeInTheDocument();
    });

    it('offers "Continuar" as its only button and never points to the app stores', async () => {
      const user = userEvent.setup();
      renderCard();

      expect(buttonNames()).toEqual(['Continuar']);
      expectNoAppStoreContent();

      await user.click(getSwitches().training);
      await user.click(getSwitches().nutrition);

      expect(buttonNames()).toEqual(['Continuar']);
      expectNoAppStoreContent();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('still points to no app store after an activation fails', async () => {
      vi.mocked(api.patch).mockRejectedValue({ userMessage: 'Não foi possível ativar seu perfil.' });
      const user = userEvent.setup();
      renderCard();

      await user.click(getSwitches().training);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Não foi possível ativar seu perfil.', 'error'));
      expect(await screen.findByRole('button', { name: 'Continuar' })).toBeEnabled();
      expect(buttonNames()).toEqual(['Continuar']);
      expectNoAppStoreContent();
    });
  });
});
