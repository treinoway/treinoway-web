import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import PrescriptionGuidance from './PrescriptionGuidance';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  PLAN_ID,
  buildGuidance,
  buildOverview,
  buildPlan,
  buildSheet,
} from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();
const BASE = `/nutritionist/patients/${PATIENT_ID}`;
const PATCH_URL = `/nutritionist/plans/${PLAN_ID}/guidance`;
const SAVE_TIMEOUT = { timeout: 3000 };

// Test helper: api error.
const apiError = (userMessage, status = 422, messageCode = 'nutrition.plan.noMeals') =>
  Object.assign(new Error(userMessage), { userMessage, response: { status, data: { messageCode } } });

// Test helper: base plan.
const basePlan = (overrides = {}) => buildPlan({ guidance: buildGuidance(), ...overrides });

// Test helper: mock api.
const mockApi = ({ plan = basePlan() } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE}/plan`) return Promise.resolve({ data: plan });
    if (url === `${BASE}/sheet`) return Promise.resolve({ data: buildSheet() });
    if (url === `${BASE}/overview`) return Promise.resolve({ data: buildOverview() });
    return Promise.resolve({ data: {} });
  });
  api.patch.mockImplementation((url, body) => Promise.resolve({
    data: { ...plan, guidance: { ...plan.guidance, ...body } },
  }));
};

// Test helper: render page.
const renderPage = () =>
  renderWithRoute(<PrescriptionGuidance />, { route: `${BASE}/plan/guidance`, path: '/nutritionist/patients/:patientId/plan/guidance' });

// Test helper: render loaded.
const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Orientações do plano' });
  return view;
};

// Test helper: retype number.
const retypeNumber = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};

// Test helper: preview.
const preview = () => screen.getByRole('region', { name: 'Como a Luiza vê' });
// Test helper: expect patched.
const expectPatched = (matcher) =>
  waitFor(() => expect(api.patch).toHaveBeenCalledWith(PATCH_URL, expect.objectContaining(matcher)), SAVE_TIMEOUT);

describe('PrescriptionGuidance (tela D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('states and navigation', () => {
    it('shows the loading state first', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('shows an error with retry when loading fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Erro interno do servidor.' }));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByRole('heading', { name: 'Orientações do plano' })).toBeInTheDocument();
    });

    it('shows the breadcrumb, the eyebrow and the subtitle', async () => {
      await renderLoaded();
      expect(screen.getByRole('link', { name: 'Meus Pacientes' })).toBeInTheDocument();
      expect(screen.getByText('Prescrição · Luiza Andrade · 66 kg')).toBeInTheDocument();
      expect(screen.getByText(/Cada bloco mostra onde aparece/)).toBeInTheDocument();
    });

    it('renders the stepper with Orientações current and links back to Cardápio and to the summary', async () => {
      const { container } = await renderLoaded();
      const stepper = screen.getByRole('navigation', { name: 'Etapas da prescrição' });
      expect(container.querySelector('.wizard-stepper')).toBe(stepper);
      expect(within(stepper).getByText('Orientações').closest('[aria-current="step"]')).not.toBeNull();
      expect(within(stepper).getByRole('link', { name: /Cardápio/ })).toHaveAttribute('href', `${BASE}/plan/menu`);
      expect(screen.getByRole('tablist', { name: 'Visualização do plano' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Prescrição detalhada' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Prescrição simples' })).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: 'Cardápio' })).toHaveLength(2);
      expect(screen.queryByRole('link', { name: /Próximo/ })).not.toBeInTheDocument();
    });
  });

  describe('water (criterion 20)', () => {
    it('shows the daily target in litres and the number of 250 ml cups', async () => {
      await renderLoaded();
      expect(screen.getByLabelText('Meta diária')).toHaveValue(2.5);
      expect(screen.getByText('No app: meta de 2,5 L, em 10 copos de 250 ml.')).toBeInTheDocument();
      expect(screen.getByText('litros')).toBeInTheDocument();
    });

    it('autosaves the target in millilitres', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Meta diária'), '3');

      expect(api.patch).not.toHaveBeenCalled();
      await expectPatched({ waterTargetMl: 3000 });
      expect(screen.getByText('No app: meta de 3 L, em 12 copos de 250 ml.')).toBeInTheDocument();
    });

    it('"Usar 35 ml/kg" fills the suggestion from the patient weight (66 kg = 2,3 L)', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: /Usar 35 ml\/kg · 2,3 L/ }));

      expect(Number(screen.getByLabelText('Meta diária').value)).toBeCloseTo(2.3, 1);
      await expectPatched({ waterTargetMl: expect.any(Number) });
    });

    it('shows "Sem meta de água definida." when empty', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.clear(screen.getByLabelText('Meta diária'));

      expect(screen.getByText('Sem meta de água definida.')).toBeInTheDocument();
    });
  });

  describe('free meal (DS Segmented, criterion 20)', () => {
    it('offers Não liberar / 1 por semana / 2 por semana with the plan value selected', async () => {
      const { container } = await renderLoaded();
      const group = screen.getByRole('tablist', { name: 'Refeições livres por semana' });
      expect(group).toHaveClass('segmented');
      expect(container.querySelectorAll('.segmented').length).toBeGreaterThan(0);
      expect(within(group).getByRole('tab', { name: 'Não liberar' })).toHaveAttribute('aria-selected', 'false');
      expect(within(group).getByRole('tab', { name: '1 por semana' })).toHaveAttribute('aria-selected', 'true');
      expect(within(group).getByRole('tab', { name: '2 por semana' })).toHaveAttribute('aria-selected', 'false');
    });

    it('saves the chosen frequency', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('tab', { name: '2 por semana' }));

      await expectPatched({ freeMealsPerWeek: 2 });
    });

    it('shows the guidance text limited to 500 characters with a counter', async () => {
      await renderLoaded();
      const text = screen.getByRole('textbox', { name: 'Orientação' });
      expect(text).toHaveValue('De preferência no fim de semana.');
      expect(text).toHaveAttribute('maxlength', '500');
      expect(screen.getByText('32/500')).toBeInTheDocument();
    });

    it('hides the text and explains when free meals are not allowed', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('tab', { name: 'Não liberar' }));

      expect(screen.queryByRole('textbox', { name: 'Orientação' })).not.toBeInTheDocument();
      expect(screen.getByText(/Sem refeição livre neste plano/)).toBeInTheDocument();
      await expectPatched({ freeMealsPerWeek: 0 });
    });
  });

  describe('supplements', () => {
    it('lists each supplement with name, dose and when fields', async () => {
      await renderLoaded();
      expect(screen.getByLabelText('Nome do suplemento')).toHaveValue('Whey protein concentrado');
      expect(screen.getByLabelText('Dose de whey protein concentrado')).toHaveValue('30 g');
      expect(screen.getByLabelText('Quando tomar whey protein concentrado')).toHaveValue('Depois do treino');
    });

    it('adds an empty supplement row and saves the typed values', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: /Adicionar suplemento/ }));
      const names = screen.getAllByLabelText('Nome do suplemento');
      expect(names).toHaveLength(2);
      await user.type(names[1], 'Creatina');

      await expectPatched({
        supplements: [
          { name: 'Whey protein concentrado', dose: '30 g', when: 'Depois do treino' },
          expect.objectContaining({ name: 'Creatina' }),
        ],
      });
    });

    it('removes a supplement', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Remover whey protein concentrado' }));

      expect(screen.queryByLabelText('Nome do suplemento')).not.toBeInTheDocument();
      await expectPatched({ supplements: [] });
    });

    it('does not offer saved supplement templates in v1', async () => {
      await renderLoaded();
      expect(screen.queryByRole('button', { name: /modelo salvo/i })).not.toBeInTheDocument();
    });
  });

  describe('observations', () => {
    it('limits the notes to 2000 characters, with counter, and autosaves', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const notes = screen.getByRole('textbox', { name: 'Observações do plano' });
      expect(notes).toHaveAttribute('maxlength', '2000');
      expect(screen.getByText('52/2000')).toBeInTheDocument();

      await user.clear(notes);
      await user.type(notes, 'Beber água');

      await expectPatched({ observations: 'Beber água' });
    });
  });

  describe('app preview', () => {
    it('mirrors water, free meal and supplements, and says notes stay out of the app', async () => {
      await renderLoaded();
      const view = preview();
      expect(within(view).getByText('2,5 L')).toBeInTheDocument();
      expect(within(view).getByText('1 por semana')).toBeInTheDocument();
      expect(within(view).getByText('De preferência no fim de semana.')).toBeInTheDocument();
      expect(within(view).getByText('Whey protein concentrado · 30 g')).toBeInTheDocument();
      expect(within(view).getByText('Depois do treino')).toBeInTheDocument();
      expect(within(view).getByText('As observações do plano ficam no PDF, fora do app.')).toBeInTheDocument();
    });

    it('updates with the form as the nutritionist types', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('tab', { name: '2 por semana' }));
      await user.click(screen.getByRole('button', { name: /Adicionar suplemento/ }));
      await user.type(screen.getAllByLabelText('Nome do suplemento')[1], 'Creatina');

      expect(within(preview()).getByText('2 por semana')).toBeInTheDocument();
      expect(within(preview()).getByText(/Creatina/)).toBeInTheDocument();
      expect(within(preview()).getByText('horário a definir')).toBeInTheDocument();
    });
  });

  describe('autosave status (criterion 10)', () => {
    it('shows the sticky bar status with the "Salvo automaticamente" text', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Meta diária'), '3');

      expect(await screen.findByText(/^Salvo automaticamente às \d{2}:\d{2}$/, {}, SAVE_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/Salvo automaticamente/);
    });

    it('shows the error with retry', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      api.patch
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { userMessage: 'Falhou' }))
        .mockImplementation((url, body) => Promise.resolve({ data: { ...basePlan(), guidance: { ...buildGuidance(), ...body } } }));

      await retypeNumber(user, screen.getByLabelText('Meta diária'), '3');

      expect(await screen.findByText(/Não foi possível salvar/, {}, SAVE_TIMEOUT)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(await screen.findByText(/^Salvo automaticamente às/)).toBeInTheDocument();
    });
  });

  describe('publish (DS .btn--primary, criteria 21, 22)', () => {
    it('renders "Publicar plano" as the primary button of the sticky bar', async () => {
      await renderLoaded();
      expect(screen.getByRole('button', { name: 'Publicar plano' })).toHaveClass('btn', 'btn--primary');
    });

    it('shows the Publicado state instead of the button when the app already has the current version', async () => {
      mockApi({ plan: basePlan({ status: 'published', hasUnpublishedChanges: false }) });
      await renderLoaded();
      expect(screen.getByText('Publicado')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Publicar plano' })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Publicado · já aparece no app do paciente.');
    });

    it('offers to publish again when a published plan has unpublished changes', async () => {
      mockApi({ plan: basePlan({ status: 'published', hasUnpublishedChanges: true }) });
      await renderLoaded();
      expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeInTheDocument();
      expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
    });

    it('POSTs publish and shows the Publicado state', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: basePlan({ status: 'published', version: 2, publishedAt: '2026-11-01T14:00:00.000Z' }) });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.post.mock.calls.map(([url]) => url)).toContain(`/nutritionist/plans/${PLAN_ID}/publish`));
      expect(await screen.findByText('Publicado')).toBeInTheDocument();
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/publicado/i), 'success');
    });

    it('flushes a pending edit before publishing', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: basePlan({ status: 'published' }) });
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Meta diária'), '3');
      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.post).toHaveBeenCalled());
      expect(api.patch).toHaveBeenCalledWith(PATCH_URL, expect.objectContaining({ waterTargetMl: 3000 }));
      expect(api.patch.mock.invocationCallOrder[0]).toBeLessThan(api.post.mock.invocationCallOrder[0]);
    });

    it('shows the API reason when publishing is refused (no meals / no kcal target)', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Defina uma meta calórica antes de publicar.', 422, 'nutrition.plan.noKcalTarget'));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Defina uma meta calórica antes de publicar.', 'error'));
      expect(screen.queryByText('Publicado')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeEnabled();
    });

    it('disables the button while publishing', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {}));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      expect(await screen.findByRole('button', { name: /Publicando/ })).toBeDisabled();
    });
  });
});
