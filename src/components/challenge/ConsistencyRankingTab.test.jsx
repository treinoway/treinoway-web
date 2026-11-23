import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within, waitFor } from '../../test/test-utils';
import ConsistencyRankingTab from './ConsistencyRankingTab';
import { useToast } from '../../contexts/ToastContext';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const TIME_ZONE = 'America/Sao_Paulo';
const NOW = new Date('2026-11-18T15:00:00Z');

// Participant row as the consistency route returns it
const row = (overrides = {}) => ({
  studentId: 's1',
  name: 'Ana Lima',
  displayName: 'Ana L.',
  initials: 'AL',
  position: 1,
  eligible: true,
  faixa: 'constant',
  average: 95,
  validWeeks: 2,
  weeks100: 1,
  streak: 3,
  currentWeekScore: 84.4,
  weekStatus: 'valid',
  entering: null,
  weeksMissing: 0,
  ...overrides,
});

// Entering row: no position yet, with its valid weeks against the minimum
const enteringRow = (overrides = {}) => row({ studentId: 's9', name: 'Zeca Paz', displayName: 'Zeca P.', position: null, eligible: false, faixa: 'entering', average: 80, validWeeks: 1, weeks100: 0, streak: 0, entering: { validWeeks: 1, required: 2 }, weeksMissing: 1, ...overrides });

const ROWS = [
  row(),
  row({ studentId: 's2', name: 'Bia Souza', displayName: 'Bia S.', position: 2, average: 90, faixa: 'steady', weeks100: 2, streak: 1 }),
  row({ studentId: 's3', name: 'Caio Reis', displayName: 'Caio R.', position: 2, average: 90, faixa: 'steady' }),
  row({ studentId: 's4', name: 'Duda Melo', displayName: 'Duda M.', position: 4, average: 60, faixa: 'restarting', streak: 0 }),
];

// Consistency payload of a championship
const payload = (overrides = {}) => ({
  challenge: {
    id: 'c1',
    name: 'Verão 2027',
    description: 'Prêmio: uma camiseta para o 1º lugar',
    startDate: '2026-11-02',
    endDate: '2026-11-29',
    weeks: 4,
    minPodiumWeeks: 2,
    participantCount: 5,
    closedAt: null,
  },
  status: 'active',
  currentWeek: 3,
  closesAt: '2026-11-23T00:00:00Z',
  rows: ROWS,
  entering: [enteringRow()],
  summary: { classified: 4, entering: 1, leaderAverage: 95, leaderLead: 5.2, championshipAverage: 82.4 },
  ...overrides,
});

// Renders the tab with spies for every action
const renderTab = (props = {}) => {
  const handlers = {
    onRetry: vi.fn(),
    onOpenStudent: vi.fn(),
    onBonus: vi.fn(),
    onViewPoints: vi.fn(),
    onRemove: vi.fn(),
    onAdjustRules: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onAddParticipants: vi.fn(),
  };
  const view = render(<ConsistencyRankingTab data={payload()} loading={false} error={null} timeZone={TIME_ZONE} now={NOW} {...handlers} {...props} />);
  return { ...handlers, ...view };
};

// Body rows of the standings table
const bodyRows = () => within(screen.getByRole('region', { name: 'Classificação do campeonato' })).getAllByRole('row').slice(1);

// Metric card by its label
const card = (label) => screen.getByText(label).closest('.metric-card');

describe('ConsistencyRankingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: vi.fn() });
  });

  it('CPD-32 shows the Participantes, Média do líder, Média do campeonato and Semana cards from the summary', () => {
    renderTab();

    expect(card('Participantes')).toHaveTextContent('5');
    expect(within(card('Participantes')).getByText('4 classificados · 1 entrando')).toBeInTheDocument();
    expect(within(card('Média do líder')).getByText('95%')).toBeInTheDocument();
    expect(within(card('Média do líder')).getByText('5 pontos à frente do 2º lugar')).toBeInTheDocument();
    expect(within(card('Média do campeonato')).getByText('82%')).toBeInTheDocument();
    expect(within(card('Semana')).getByText('3 de 4')).toBeInTheDocument();
    expect(within(card('Semana')).getByText('Fecha domingo, 22/11, às 21h · faltam 4d 9h')).toBeInTheDocument();
  });

  it('CPD-33 shows the podium with average, weeks at 100% and streak and the tie-break note', () => {
    renderTab();

    const podium = screen.getByRole('list', { name: 'Pódio' });
    const places = within(podium).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['2º lugar', '1º lugar', '2º lugar']);
    expect(within(places[1]).getByText('Ana L.')).toBeInTheDocument();
    expect(within(places[1]).getByText('95%')).toBeInTheDocument();
    expect(within(places[1]).getByText('1 semana a 100% · sequência de 3 semanas')).toBeInTheDocument();
    expect(within(places[0]).getByText('2 semanas a 100% · sequência de 1 semana')).toBeInTheDocument();
    expect(screen.getByText('Quem está na frente')).toBeInTheDocument();
    expect(screen.getByText('Desempate: maior média, depois mais semanas a 100% e maior sequência')).toBeInTheDocument();
    expect(within(podium).queryByText('Duda M.')).not.toBeInTheDocument();
  });

  it('CPD-34 lists classified rows with band, average, current week, weeks at 100% and streak, then the entering ones', () => {
    const { container } = renderTab();

    expect(screen.getByText('Todos os participantes')).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Posição', 'Aluno', 'Faixa', 'Média', 'Semana atual', 'Semanas a 100%', 'Sequência', 'Ações']);

    const rows = bodyRows();
    expect(rows).toHaveLength(5);
    const cells = within(rows[0]).getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells.slice(0, 7)).toEqual(['1º', expect.stringContaining('Ana L.'), 'Constante', '95%', '84%', '1', '3 semanas']);
    expect(within(rows[3]).getAllByRole('cell')[6]).toHaveTextContent('—');
    expect(within(rows[3]).getByText('4º')).toBeInTheDocument();
    expect(container.querySelectorAll('.consistency-medal')).toHaveLength(0);
    expect(within(rows[0]).getAllByRole('cell')[0].childElementCount).toBe(0);
    expect(within(rows[1]).getAllByRole('cell')[0].childElementCount).toBe(0);

    expect(within(rows[4]).getByText('Zeca P.')).toBeInTheDocument();
    expect(within(rows[4]).getAllByRole('cell')[0]).toHaveTextContent('—');
    expect(within(rows[4]).getByText('Entrando · 1 de 2 semanas')).toBeInTheDocument();
  });

  it('CPD-34 shows the 100% band as a light DS tag, not a solid pill', () => {
    renderTab({ data: payload({ rows: [row({ faixa: 'full', average: 100 })], entering: [] }) });

    const band = within(bodyRows()[0]).getByText('100%', { selector: '.badge' });
    expect(band).toHaveClass('badge--tag', 'badge--success');
    expect(band).not.toHaveClass('badge--solid');
  });

  it('CPD-35 updates "Mostrando N de M participantes" as the trainer searches', async () => {
    const user = userEvent.setup();
    renderTab({ data: payload({ rows: [...ROWS, row({ studentId: 's5', name: 'Álvaro Dias', displayName: 'Álvaro D.', position: 5 })] }) });

    expect(screen.getByText('Mostrando 6 de 6 participantes')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'ALVARO');

    expect(screen.getByText('Mostrando 1 de 6 participantes')).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
    expect(within(bodyRows()[0]).getByText('Álvaro D.')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar aluno' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'Lima');

    expect(screen.getByText('Mostrando 1 de 6 participantes')).toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText('Ana L.')).toBeInTheDocument();
  });

  it('CPD-36 shows "Nenhum participante encontrado." when the search finds nobody', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'Xuxa');

    expect(screen.getByText('Nenhum participante encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Classificação do campeonato' })).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 0 de 5 participantes')).toBeInTheDocument();
  });

  it('CPD-37 offers Dar bônus, Ver pontos and Remover do campeonato in the row menu and opens the student panel on the row', async () => {
    const user = userEvent.setup();
    const { onBonus, onViewPoints, onRemove, onOpenStudent } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Ações para Ana L.' }));
    expect(screen.getByRole('button', { name: 'Dar bônus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover do campeonato' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dar bônus' }));
    expect(onBonus).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1' }));

    await user.click(screen.getByRole('button', { name: 'Ações para Bia S.' }));
    await user.click(screen.getByRole('button', { name: 'Ver pontos' }));
    expect(onViewPoints).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2' }));

    await user.click(screen.getByRole('button', { name: 'Ações para Caio R.' }));
    await user.click(screen.getByRole('button', { name: 'Remover do campeonato' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's3' }));

    await user.click(screen.getByRole('button', { name: 'Ana L.' }));
    expect(onOpenStudent).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1', name: 'Ana Lima' }));
    expect(onOpenStudent).toHaveBeenCalledTimes(1);
  });

  it('CPD-45 shows the scheduled block with Ajustar regras and Excluir campeonato', async () => {
    const user = userEvent.setup();
    const { onAdjustRules, onDelete } = renderTab({
      data: payload({ status: 'scheduled', currentWeek: null, closesAt: null, rows: [], entering: [], summary: undefined, challenge: { ...payload().challenge, startDate: '2026-11-23', endDate: '2026-12-20' } }),
    });

    expect(screen.getByRole('heading', { name: 'O campeonato começa em 23/11' })).toBeInTheDocument();
    expect(document.querySelector('.championship-tab .empty-block__icon .lucide-calendar')).not.toBeNull();
    expect(screen.getByText('O ranking aparece quando os participantes pontuarem pela primeira vez. Até lá, as regras de pontuação ainda podem ser ajustadas.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Classificação do campeonato' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Ajustar regras' })).toHaveClass('btn', 'btn--neutral');
    await user.click(screen.getByRole('button', { name: 'Ajustar regras' }));
    expect(onAdjustRules).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Excluir campeonato' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Excluir o campeonato "Verão 2027"? Esta ação não pode ser desfeita.');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('CPD-46 shows the closed notice and Classificação final', () => {
    renderTab({
      data: payload({
        status: 'completed',
        currentWeek: 4,
        closesAt: null,
        challenge: { ...payload().challenge, closedAt: '2026-11-30T00:05:00Z' },
        rows: [row({ currentWeekScore: null })],
        entering: [],
        summary: { classified: 1, entering: 0, leaderAverage: 95, leaderLead: null, championshipAverage: 95 },
      }),
    });

    expect(screen.getByRole('note')).toHaveTextContent('Campeonato encerrado em 29/11. O ranking é final e não pode ser editado.');
    expect(screen.getByText('Classificação final')).toBeInTheDocument();
    expect(within(card('Semana')).getByText('4 de 4')).toBeInTheDocument();
    expect(screen.queryByText(/faltam/)).not.toBeInTheDocument();
    expect(within(bodyRows()[0]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1º', expect.stringContaining('Ana L.'), 'Constante', '95%', '—', '1', '3 semanas']);
    expect(screen.queryByRole('searchbox', { name: 'Buscar aluno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ações para Ana L.' })).not.toBeInTheDocument();
  });

  it('CPD-46 dates the closed notice with the championship end date, not the day it froze', () => {
    renderTab({
      data: payload({
        status: 'completed',
        currentWeek: 4,
        closesAt: null,
        challenge: { ...payload().challenge, endDate: '2026-11-08', closedAt: '2026-11-22T15:00:00Z' },
        rows: [row({ currentWeekScore: null })],
        entering: [],
        summary: { classified: 1, entering: 0, leaderAverage: 95, leaderLead: null, championshipAverage: 95 },
      }),
    });

    expect(screen.getByRole('note')).toHaveTextContent('Campeonato encerrado em 08/11. O ranking é final e não pode ser editado.');
  });

  it('CPD-47 shows the empty block with Adicionar participantes', async () => {
    const user = userEvent.setup();
    const { onAddParticipants } = renderTab({
      data: payload({ rows: [], entering: [], summary: { classified: 0, entering: 0, leaderAverage: null, leaderLead: null, championshipAverage: null }, challenge: { ...payload().challenge, participantCount: 0 } }),
    });

    expect(screen.getByRole('heading', { name: 'Nenhum aluno no ranking ainda.' })).toBeInTheDocument();
    expect(screen.getByText('Adicione participantes para o campeonato começar a contar pontos.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar participantes' }));
    expect(onAddParticipants).toHaveBeenCalledTimes(1);
  });

  it('CPD-47 shows the empty block, not the scheduled one, for a scheduled championship without participants', async () => {
    const user = userEvent.setup();
    const { onAddParticipants } = renderTab({
      data: payload({ status: 'scheduled', currentWeek: null, closesAt: null, rows: [], entering: [], summary: undefined, challenge: { ...payload().challenge, startDate: '2026-11-23', endDate: '2026-12-20', participantCount: 0 } }),
    });

    expect(screen.getByRole('heading', { name: 'Nenhum aluno no ranking ainda.' })).toBeInTheDocument();
    expect(screen.getByText('Adicione participantes para o campeonato começar a contar pontos.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'O campeonato começa em 23/11' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajustar regras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir campeonato' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar participantes' }));
    expect(onAddParticipants).toHaveBeenCalledTimes(1);
  });

  it('CPD-48 shows "Nenhum participante com semana válida ainda." without a button', () => {
    renderTab({ data: payload({ rows: [], entering: [], summary: { classified: 0, entering: 0, leaderAverage: null, leaderLead: null, championshipAverage: null } }) });

    expect(screen.getByRole('heading', { name: 'Nenhum participante com semana válida ainda.' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Classificação do campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-63 shows the skeleton while loading', () => {
    renderTab({ data: null, loading: true });

    expect(screen.getByRole('status', { name: 'Carregando classificação' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Classificação do campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-64 shows the API error with Tentar de novo', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderTab({ data: null, error: 'Não foi possível carregar a classificação.' });

    expect(screen.getByText('Não foi possível carregar a classificação.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
