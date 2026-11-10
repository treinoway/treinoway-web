import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast }),
}));

import api from '../../api/axios';
import ConsistencyRankingSettings from './ConsistencyRankingSettings';

const BASE_URL = '/trainer/consistency-ranking';
const RULE_FIELDS = ['weights', 'activePillars', 'closeWeekday', 'closeHour', 'timeZone'];

const CONFIG = {
  weights: { workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 },
  activePillars: ['workouts', 'cardio', 'feedback', 'hydration'],
  seasonWeeks: 4,
  minPodiumWeeks: 2,
  closeWeekday: 0,
  closeHour: 21,
  timeZone: 'America/Sao_Paulo',
  minWorkoutMinutes: 10,
  riskLimit: 70,
  riskWeeks: 2,
  batchCount: 5,
  batchMinutes: 30,
};

const STANDINGS = {
  season: { number: 3, status: 'active', startWeek: '2026-10-19', endWeek: '2026-11-09', weeks: 4, currentWeek: 3, closesAt: '2026-11-09T00:00:00.000Z' },
  summary: {},
  counts: {},
  rows: [],
  entering: [],
};

const SEASONS = {
  seasons: [
    { number: 2, startWeek: '2026-09-21', endWeek: '2026-10-12', participants: 17, average: 82 },
    { number: 1, startWeek: '2026-08-24', endWeek: '2026-09-14', participants: 15, average: 79 },
  ],
};

// Shows the route and query string the page navigated to
const LocationProbe = () => {
  const location = useLocation();
  return <div>{`Ranking: ${location.pathname}${location.search}`}</div>;
};

// Routes every request of the page by URL
const mockApi = ({ config = CONFIG } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE_URL}/config`) return Promise.resolve({ data: config });
    if (url === `${BASE_URL}/standings`) return Promise.resolve({ data: STANDINGS });
    if (url === `${BASE_URL}/seasons`) return Promise.resolve({ data: SEASONS });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => Promise.resolve({ data: { ...config, ...body, effectiveFrom: RULE_FIELDS.some((field) => field in body) ? '2026-11-09' : null } }));
  api.post.mockResolvedValue({ data: { number: 3, status: 'active', closeRequestedAt: '2026-11-05T12:00:00.000Z' } });
};

// Renders the settings page with markers for the ranking route
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/consistency-ranking/settings']}>
      <Link to="/trainer/students">Menu Alunos</Link>
      <Routes>
        <Route path="/trainer/consistency-ranking/settings" element={<ConsistencyRankingSettings />} />
        <Route path="/trainer/consistency-ranking" element={<LocationProbe />} />
        <Route path="/trainer/students" element={<div>Página de alunos</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the page to finish loading
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Configuração do ranking' });

// Types a new value in the number field of a pillar weight
const setWeight = async (user, pillarLabel, value) => {
  const field = screen.getByRole('spinbutton', { name: `Valor do peso de ${pillarLabel}` });
  await user.clear(field);
  await user.type(field, String(value));
};

describe('ConsistencyRankingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('PAN-37 shows the current season with the end action, the durations and the close note', async () => {
    renderPage();
    await waitForPage();

    expect(await screen.findByRole('heading', { name: 'Temporada 3' })).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText(/semana 3 de 4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar temporada' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '4 semanas', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '8 semanas' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '12 semanas' })).toBeInTheDocument();
    expect(screen.getByText(/fecha a temporada no próximo domingo às 21h/)).toBeInTheDocument();
    expect(screen.getByText('Sempre de segunda a domingo. Vale a partir da Temporada 4 (16/11).')).toBeInTheDocument();
  });

  it('PAN-36 leaves out the blocks of features that do not exist yet', async () => {
    renderPage();
    await waitForPage();

    expect(screen.getByRole('heading', { name: 'Pilares e pesos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Regras de justiça' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Temporadas anteriores' })).toBeInTheDocument();
    expect(screen.queryByText('Recursos para o aluno')).not.toBeInTheDocument();
    expect(screen.queryByText('Visibilidade e privacidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Sequência conta semanas a partir de')).not.toBeInTheDocument();
    expect(screen.queryByText(/Coringa/)).not.toBeInTheDocument();
  });

  it('PAN-38 updates the effective weights and the sum when a weight changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(screen.getByText('Peso efetivo com Dieta desligada: Treinos 42,9% · Cardio 21,4% · Feedback 21,4% · Hidratação 14,3%')).toBeInTheDocument();

    await setWeight(user, 'Cardio', 20);
    await setWeight(user, 'Treinos', 25);

    expect(screen.getByText('100 de 100')).toBeInTheDocument();
    expect(screen.getByText('Peso efetivo com Dieta desligada: Treinos 35,7% · Cardio 28,6% · Feedback 21,4% · Hidratação 14,3%')).toBeInTheDocument();
  });

  it('PAN-38 moves the effective weights when a pillar is switched on', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' }));

    expect(screen.getByText('Peso efetivo com todos os pilares ligados: Treinos 30,0% · Cardio 15,0% · Feedback 15,0% · Hidratação 10,0% · Dieta 30,0%')).toBeInTheDocument();
  });

  it('PAN-39 blocks saving and highlights the sum when it is not 100', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await setWeight(user, 'Cardio', 20);

    expect(screen.getByText('105 de 100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('PAN-38 restores the default weights from the link under the sum', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await setWeight(user, 'Cardio', 20);

    await user.click(screen.getByRole('button', { name: 'Restaurar 30 · 30 · 15 · 15 · 10' }));

    expect(screen.getByText('100 de 100')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Cardio' })).toHaveValue(15);
  });

  it('PAN-40 saves the weights and shows from which Monday they apply', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await setWeight(user, 'Cardio', 20);
    await setWeight(user, 'Treinos', 25);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Pesos novos valem a partir de segunda, 09/11. A Temporada 3 continua e as semanas fechadas mantêm o score.')).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { weights: { workouts: 25, diet: 30, cardio: 20, feedback: 15, hydration: 10 } });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('PAN-40 shows no new-weights notice after saving only the closing hour, although the service returns effectiveFrom', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Hora do fechamento' }), '20:00');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { closeHour: 20 }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    expect(screen.queryByText(/Pesos novos valem/)).not.toBeInTheDocument();
  });

  it('PAN-41 saves the risk limit and weeks chosen in the one select', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 3 semanas');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { riskLimit: 80, riskWeeks: 3 }));
  });

  it('PAN-41 saves only the fairness rule that changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 2 semanas');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { riskLimit: 80 }));
    expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success');
    expect(screen.queryByText(/Pesos novos valem/)).not.toBeInTheDocument();
  });

  it('PAN-37 saves the season duration chosen', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('tab', { name: '8 semanas' }));
    expect(screen.getByRole('tab', { name: '8 semanas', selected: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { seasonWeeks: 8 }));
  });

  it('PAN-42 fills the defaults without saving until "Salvar"', async () => {
    mockApi({ config: { ...CONFIG, minPodiumWeeks: 3, riskLimit: 80 } });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(screen.getByRole('combobox', { name: 'Mínimo para o pódio' })).toHaveValue('3');

    await user.click(screen.getByRole('button', { name: 'Restaurar padrões' }));

    expect(screen.getByRole('combobox', { name: 'Mínimo para o pódio' })).toHaveValue('2');
    expect(screen.getByRole('combobox', { name: 'Alerta de risco' })).toHaveValue('70:2');
    expect(api.put).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { minPodiumWeeks: 2, riskLimit: 70 }));
  });

  it('PAN-43 confirms before ending the season and then schedules the close', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(await screen.findByRole('button', { name: 'Encerrar temporada' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Encerrar temporada' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Encerrar temporada' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/seasons/current/close`));
    expect(await screen.findByRole('button', { name: 'Encerramento agendado' })).toBeDisabled();
  });

  it('PAN-44 asks before leaving with unsaved changes and leaves once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 2 semanas');

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Configuração do ranking' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Ranking: /trainer/consistency-ranking')).toBeInTheDocument();
  });

  it('PAN-44 also asks when the personal leaves through a menu link, and navigates once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 2 semanas');

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    expect(screen.queryByText('Página de alunos')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Configuração do ranking' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
  });

  it('PAN-44 also asks when the personal presses the browser Back button with unsaved changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 2 semanas');

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Configuração do ranking' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Alerta de risco' })).toHaveValue('80:2');
  });

  it('PAN-44 lets a menu link navigate at once when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('PAN-44 leaves at once when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Ranking: /trainer/consistency-ranking')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('PAN-45 lists the previous seasons and opens the frozen standings of one', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    expect(await screen.findByRole('listitem', { name: 'Temporada 2' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Temporada 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver classificação da Temporada 1' }));

    expect(await screen.findByText('Ranking: /trainer/consistency-ranking?season=1')).toBeInTheDocument();
  });

  it('PAN-37 shows a loading state while the configuration loads', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Carregando configuração' })).toBeInTheDocument();
  });

  it('PAN-37 shows the API error with retry when the configuration fails', async () => {
    let failing = true;
    api.get.mockImplementation((url) => {
      if (url === `${BASE_URL}/config` && failing) return Promise.reject({ userMessage: 'Não foi possível carregar a configuração.' });
      if (url === `${BASE_URL}/config`) return Promise.resolve({ data: CONFIG });
      if (url === `${BASE_URL}/standings`) return Promise.resolve({ data: STANDINGS });
      return Promise.resolve({ data: SEASONS });
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Não foi possível carregar a configuração.')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Configuração do ranking' })).toBeInTheDocument();
  });

  it('PAN-40 shows the API error as a toast when saving fails', async () => {
    api.put.mockRejectedValue({ userMessage: 'Soma dos pesos inválida.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Alerta de risco' }), 'Abaixo de 80% por 2 semanas');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Soma dos pesos inválida.', 'error'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
});
