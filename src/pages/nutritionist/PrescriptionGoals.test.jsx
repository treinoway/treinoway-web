import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import PrescriptionGoals from './PrescriptionGoals';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  PLAN_ID,
  buildGoals,
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
const SAVE_TIMEOUT = { timeout: 3000 };
const PATCH_URL = `/nutritionist/plans/${PLAN_ID}/goals`;

const plan = buildPlan({ goals: buildGoals() });

// Echoes the PATCH body into the plan, like the real endpoint does.
const echoPatch = (url, body) => Promise.resolve({ data: { ...plan, goals: { ...plan.goals, ...body } } });

// Test helper: mock api.
const mockApi = ({ planData = plan, sheet = buildSheet(), overview = buildOverview() } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE}/plan`) return Promise.resolve({ data: planData });
    if (url === `${BASE}/sheet`) return Promise.resolve({ data: sheet });
    if (url === `${BASE}/overview`) return Promise.resolve({ data: overview });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: render page.
const renderPage = () =>
  renderWithRoute(<PrescriptionGoals />, { route: `${BASE}/plan/goals`, path: '/nutritionist/patients/:patientId/plan/goals' });

// Test helper: render loaded.
const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Metas e gasto energético' });
  return view;
};

// Test helper: energy panel.
const energyPanel = () => screen.getByRole('region', { name: 'Cálculo do gasto energético' });
// Test helper: macro row.
const macroRow = (name) => screen.getByRole('row', { name: new RegExp(name) });
// Test helper: kcal input.
const kcalInput = () => screen.getByRole('spinbutton', { name: 'Meta calórica' });
// Test helper: select by label.
const select = (name) => screen.getByRole('combobox', { name });

// Test helper: retype number.
const retypeNumber = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};

describe('PrescriptionGoals (tela B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
    api.patch.mockImplementation(echoPatch);
  });

  describe('states', () => {
    it('shows the loading state first', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Metas e gasto energético' })).not.toBeInTheDocument();
    });

    it('loads the plan, the sheet and the overview of the patient', async () => {
      await renderLoaded();
      expect(api.get).toHaveBeenCalledWith(`${BASE}/plan`);
      expect(api.get).toHaveBeenCalledWith(`${BASE}/sheet`);
    });

    it('shows an error with retry when loading fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Erro interno do servidor.' }));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByRole('heading', { name: 'Metas e gasto energético' })).toBeInTheDocument();
    });
  });

  describe('shell (breadcrumb, header, stepper 1-2-3, sticky bar)', () => {
    it('shows the breadcrumb, the eyebrow with patient and weight, title and subtitle', async () => {
      await renderLoaded();
      expect(screen.getByRole('link', { name: 'Meus Pacientes' })).toHaveAttribute('href', '/nutritionist/patients');
      expect(screen.getByRole('link', { name: 'Luiza Andrade' })).toBeInTheDocument();
      expect(screen.getByText('Prescrição')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByText('Prescrição · Luiza Andrade · 66 kg')).toBeInTheDocument();
      expect(screen.getByText(/O GET sugere a meta calórica/)).toBeInTheDocument();
    });

    it('renders the three steps with Metas as the current one', async () => {
      const { container } = await renderLoaded();
      const stepper = screen.getByRole('navigation', { name: 'Etapas da prescrição' });
      expect(container.querySelector('.wizard-stepper')).toBe(stepper);

      expect(within(stepper).getByText('Metas e gasto energético').closest('[aria-current="step"]')).not.toBeNull();
      expect(within(stepper).getByRole('link', { name: /Cardápio/ })).toHaveAttribute('href', `${BASE}/plan/menu`);
      expect(within(stepper).getByRole('link', { name: /Orientações/ })).toHaveAttribute('href', `${BASE}/plan/guidance`);
    });

    it('links to the plan summary and to the next step in the sticky bar', async () => {
      await renderLoaded();
      expect(screen.getByRole('tablist', { name: 'Visualização do plano' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Prescrição detalhada' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Prescrição simples' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Próximo: Cardápio/ })).toHaveAttribute('href', `${BASE}/plan/menu`);
    });
  });

  describe('sheet (criterion 5)', () => {
    it('shows the pre-filled sheet data', async () => {
      await renderLoaded();
      const sheet = screen.getByRole('region', { name: 'Dados da ficha' });
      ['Feminino', '29 anos', '66 kg', '165 cm', '28% de gordura'].forEach((text) => {
        expect(within(sheet).getByText(text)).toBeInTheDocument();
      });
      expect(within(sheet).getByText(/Da avaliação de 12\/10\./)).toBeInTheDocument();
    });

    it('edits the sheet in a modal and PUTs it', async () => {
      const user = userEvent.setup();
      api.put.mockResolvedValue({ data: buildSheet({ weightKg: 70, leanMassKg: 50.4 }) });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Editar ficha' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar ficha' });
      const weight = within(dialog).getByLabelText('Peso (kg)');
      expect(weight).toHaveValue(66);
      await retypeNumber(user, weight, '70');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar ficha' }));

      await waitFor(() => expect(api.put).toHaveBeenCalledWith(
        `${BASE}/sheet`,
        expect.objectContaining({ sex: 'female', weightKg: 70, heightCm: 165, bodyFatPct: 28 }),
      ));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(within(screen.getByRole('region', { name: 'Dados da ficha' })).getByText('70 kg')).toBeInTheDocument();
    });

    it('cancelling the sheet edit sends nothing', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await user.click(screen.getByRole('button', { name: 'Editar ficha' }));

      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

      expect(api.put).not.toHaveBeenCalled();
    });

    it('shows the API error and keeps the modal when the sheet fails to save', async () => {
      const user = userEvent.setup();
      api.put.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Altura inválida.' }));
      await renderLoaded();
      await user.click(screen.getByRole('button', { name: 'Editar ficha' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar ficha' });

      await user.click(within(dialog).getByRole('button', { name: 'Salvar ficha' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Altura inválida.', 'error'));
      expect(screen.getByRole('dialog', { name: 'Editar ficha' })).toBeInTheDocument();
    });
  });

  describe('BMR protocol (criterion 6) and live energy panel (criterion 7)', () => {
    it('lists the four protocols in a select with the plan one selected and its note', async () => {
      await renderLoaded();
      const protocol = select('Protocolo da TMB');
      expect(protocol).toHaveValue('mifflin');
      expect(within(protocol).getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Mifflin-St Jeor',
        'Harris-Benedict revisada (1984)',
        'FAO/OMS (1985)',
        'Katch-McArdle (usa massa magra)',
      ]);
      expect(screen.getByText('Boa precisão pra adultos. Usa peso, altura, idade e sexo.')).toBeInTheDocument();
    });

    it('computes BMR, base, activities, adjustment, TEE and suggested target from the sheet', async () => {
      await renderLoaded();
      const panel = energyPanel();
      expect(within(panel).getByText('TMB · Mifflin-St Jeor')).toBeInTheDocument();
      expect(within(panel).getByText('Rotina · fator 1,2')).toBeInTheDocument();
      expect(within(panel).getByText('1.385')).toBeInTheDocument();
      expect(within(panel).getByText('1.662')).toBeInTheDocument();
      expect(within(panel).getByText('+255')).toBeInTheDocument();
      expect(within(panel).getByText('−20% · −383')).toBeInTheDocument();
      expect(within(panel).getByText('Gasto energético total')).toBeInTheDocument();
      expect(within(panel).getByText('1.917')).toBeInTheDocument();
      expect(within(panel).getByText('Sugestão de meta')).toBeInTheDocument();
      expect(within(panel).getByText('1.533')).toBeInTheDocument();
    });

    it.each([
      ['Harris-Benedict revisada (1984)', '1.443'],
      ['FAO/OMS (1985)', '1.466'],
      ['Katch-McArdle (usa massa magra)', '1.396'],
    ])('recalculates the BMR live when %s is chosen', async (label, bmr) => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.selectOptions(select('Protocolo da TMB'), label);

      expect(within(energyPanel()).getByText(bmr)).toBeInTheDocument();
    });

    it('explains that Katch-McArdle uses the lean mass of the sheet', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.selectOptions(select('Protocolo da TMB'), 'Katch-McArdle (usa massa magra)');

      expect(screen.getByText(/massa magra da avaliação: 47,5 kg/)).toBeInTheDocument();
    });

    it('recalculates TEE and suggestion when the routine factor changes', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.selectOptions(select('Rotina fora dos treinos'), 'Ativa · fator 1,55');

      const panel = energyPanel();
      expect(within(panel).getByText('2.402')).toBeInTheDocument();
      expect(within(panel).getByText('1.921')).toBeInTheDocument();
    });

    it.each([
      ['Manter o peso · sem ajuste', '1.917'],
      ['Déficit leve · −10%', '1.725'],
      ['Déficit moderado · −20%', '1.533'],
      ['Superávit leve · +10%', '2.109'],
    ])('suggestion follows the objective: %s -> %s', async (label, suggestion) => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.selectOptions(select('Objetivo'), label);

      expect(within(energyPanel()).getAllByText(suggestion).length).toBeGreaterThan(0);
    });
  });

  describe('activities by MET', () => {
    it('lists the activities with frequency, duration, MET and kcal/day, marking the one from training', async () => {
      await renderLoaded();
      const training = screen.getByText('Musculação').closest('li');
      expect(within(training).getByText(/4×\/semana · 60 min · MET 5,0/)).toBeInTheDocument();
      expect(within(training).getByText(/\+189 kcal\/dia/)).toBeInTheDocument();
      expect(screen.getByText('Do treino do José no TeuFit')).toBeInTheDocument();

      const manual = screen.getByText('Caminhada').closest('li');
      expect(within(manual).getByText(/66 kcal\/dia/)).toBeInTheDocument();
      expect(within(manual).queryByText(/Do treino/)).not.toBeInTheDocument();
    });

    it('uses a checkbox to include/remove an activity from the calculation', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const toggle = screen.getByRole('checkbox', { name: 'Incluir Caminhada no cálculo' });
      expect(toggle).toBeChecked();

      await user.click(toggle);

      expect(toggle).not.toBeChecked();
      const panel = energyPanel();
      expect(within(panel).getByText('1.851')).toBeInTheDocument();
      expect(within(panel).getByText('1.481')).toBeInTheDocument();
    });

    it('adds a manual activity and includes it in the energy panel', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: /Adicionar atividade/ }));
      await user.type(screen.getByLabelText('Nome da atividade'), 'Corrida');
      await retypeNumber(user, screen.getByLabelText('MET'), '8');
      await retypeNumber(user, screen.getByLabelText('Minutos por sessão'), '30');
      await retypeNumber(user, screen.getByLabelText('Sessões por semana'), '2');
      await user.click(screen.getByRole('button', { name: 'Salvar atividade' }));

      expect(screen.getByText('Corrida')).toBeInTheDocument();
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
        PATCH_URL,
        expect.objectContaining({
          activities: expect.arrayContaining([
            expect.objectContaining({ name: 'Corrida', met: 8, minutes: 30, perWeek: 2, included: true, fromTraining: false }),
          ]),
        }),
      ), SAVE_TIMEOUT);
    });
  });

  describe('calorie target and macros (criterion 9)', () => {
    it('shows the plan target, the grams, kcal and %VET per macro with carbs as remainder', async () => {
      await renderLoaded();
      expect(kcalInput()).toHaveValue(1550);

      const protein = macroRow('Proteína');
      expect(within(protein).getByLabelText('Proteína (g/kg)')).toHaveValue(1.8);
      expect(within(protein).getByText('118,8')).toBeInTheDocument();
      expect(within(protein).getByText('475')).toBeInTheDocument();
      expect(within(protein).getByText('30,7%')).toBeInTheDocument();

      const carbs = macroRow('Carboidrato');
      expect(within(carbs).getByText('Restante')).toBeInTheDocument();
      expect(within(carbs).queryByLabelText('Carboidrato (g/kg)')).not.toBeInTheDocument();
      expect(within(carbs).getByText('149,9')).toBeInTheDocument();
      expect(within(carbs).getByText('38,7%')).toBeInTheDocument();

      const fat = macroRow('Lipídio');
      expect(within(fat).getByText('52,8')).toBeInTheDocument();
      expect(screen.getByLabelText('Fibras mínimo (g)')).toHaveValue(25);
    });

    it('"Usar sugestão" copies the suggested target into the kcal field', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: /Usar sugestão · 1\.533/ }));

      expect(kcalInput()).toHaveValue(1533);
    });

    it('recalculates grams when g/kg changes', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Proteína (g/kg)'), '2');

      expect(within(macroRow('Proteína')).getByText('132,0')).toBeInTheDocument();
    });

    it('reports a closed total when macros match the target', async () => {
      await renderLoaded();
      expect(screen.getByText('Os macros fecham 1.550 kcal, igual à meta.').closest('[role="status"]')).not.toBeNull();
      expect(screen.getByText('Proteína 30,7% · Carboidrato 38,7% · Lipídio 30,7%')).toBeInTheDocument();
    });

    it('turning the remainder switch off enables carbs g/kg and reports a >= 5 kcal difference', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('switch', { name: 'Carboidrato completa as calorias que faltam' }));
      const carbPerKg = screen.getByLabelText('Carboidrato (g/kg)');
      expect(carbPerKg).toBeEnabled();
      expect(carbPerKg).toHaveValue(2.3);

      expect(screen.getByText('Os macros somam 1.558 kcal, 8 acima da meta calórica.').closest('[role="status"]')).not.toBeNull();
    });

    it('warns when protein and fat alone already pass the calorie target', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, kcalInput(), '900');

      expect(
        screen.getByText('Proteína e lipídio já passam da meta calórica. Revê os g/kg ou a meta.').closest('[role="status"]'),
      ).not.toBeNull();
    });
  });

  describe('autosave (criterion 10, sticky bar status)', () => {
    it('does not save on load', async () => {
      await renderLoaded();
      await new Promise((resolve) => { setTimeout(resolve, 1700); });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('PATCHes the goals within 1.5 s of an edit, not immediately', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Proteína (g/kg)'), '2');
      expect(api.patch).not.toHaveBeenCalled();

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(PATCH_URL, expect.objectContaining({ proteinPerKg: 2 })), SAVE_TIMEOUT);
      expect(screen.getByLabelText('Proteína (g/kg)')).toHaveValue(2);
    });

    it('goes "Salvando…" then "Salvo automaticamente às HH:MM"', async () => {
      const user = userEvent.setup();
      let finish;
      api.patch.mockImplementation((url, body) => new Promise((resolve) => {
        finish = () => resolve({ data: { ...plan, goals: { ...plan.goals, ...body } } });
      }));
      await renderLoaded();

      await retypeNumber(user, kcalInput(), '1600');

      expect(await screen.findByText('Salvando…', {}, SAVE_TIMEOUT)).toBeInTheDocument();
      finish();
      expect(await screen.findByText(/^Salvo automaticamente às \d{2}:\d{2}$/)).toBeInTheDocument();
    });

    it('shows an error with a retry button, and retry saves again', async () => {
      const user = userEvent.setup();
      api.patch
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { userMessage: 'Falhou' }))
        .mockImplementation(echoPatch);
      await renderLoaded();

      await retypeNumber(user, kcalInput(), '1600');

      expect(await screen.findByText(/Não foi possível salvar/, {}, SAVE_TIMEOUT)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByText(/^Salvo automaticamente às \d{2}:\d{2}$/)).toBeInTheDocument();
      expect(api.patch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('stays on the step when the pending save fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue(Object.assign(new Error('boom'), { userMessage: 'Falhou' }));
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Lipídio (g/kg)'), '1');
      await user.click(screen.getByRole('link', { name: /Próximo: Cardápio/ }));

      expect(await screen.findByText(/Não foi possível salvar/)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Metas e gasto energético' })).toBeInTheDocument();
    });

    it('flushes a pending edit when moving to the next step', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText('Lipídio (g/kg)'), '1');
      await user.click(screen.getByRole('link', { name: /Próximo: Cardápio/ }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(PATCH_URL, expect.objectContaining({ fatPerKg: 1 })));
    });
  });
});
