import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ChallengeConsistencyTab from './ChallengeConsistencyTab';

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
    participantCount: 3,
    closedAt: null,
  },
  status: 'active',
  currentWeek: 3,
  closesAt: '2026-11-23T00:00:00Z',
  rows: [row()],
  entering: [],
  ...overrides,
});

// Renders the tab with the given props
const renderTab = (props = {}) => {
  const onRetry = vi.fn();
  const onOpenStudent = vi.fn();
  render(<ChallengeConsistencyTab data={payload()} loading={false} error={null} onRetry={onRetry} onOpenStudent={onOpenStudent} timeZone={TIME_ZONE} now={NOW} {...props} />);
  return { onRetry, onOpenStudent };
};

// Body rows of the standings table
const bodyRows = () => within(screen.getByRole('region', { name: 'Classificação do campeonato' })).getAllByRole('row').slice(1);

describe('ChallengeConsistencyTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CAMP-51 says 1 semana in the header of a one-week championship', () => {
    renderTab({
      data: payload({ currentWeek: 1, challenge: { ...payload().challenge, startDate: '2026-11-16', endDate: '2026-11-22', weeks: 1 } }),
    });

    expect(screen.getByText('16/11 a 22/11 · 1 semana')).toBeInTheDocument();
  });

  it('CAMP-51 renders the header and every column of a row', () => {
    const { container } = render(
      <ChallengeConsistencyTab
        data={payload({
          rows: [
            row(),
            row({ studentId: 's2', name: 'Bia Souza', displayName: 'Bia S.', position: 2, average: 90, faixa: 'steady' }),
            row({ studentId: 's3', name: 'Caio Reis', displayName: 'Caio R.', position: 2, average: 90, faixa: 'steady' }),
            row({ studentId: 's4', name: 'Duda Melo', displayName: 'Duda M.', position: 4, average: 60, faixa: 'restarting' }),
          ],
        })}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onOpenStudent={vi.fn()}
        timeZone={TIME_ZONE}
        now={NOW}
      />,
    );

    expect(screen.getByText('Prêmio: uma camiseta para o 1º lugar')).toBeInTheDocument();
    expect(screen.getByText('02/11 a 29/11 · 4 semanas')).toBeInTheDocument();
    expect(screen.getByText('Semana 3 de 4')).toBeInTheDocument();
    expect(screen.getByText('Fecha domingo, 22/11, às 21h · faltam 4d 9h')).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Pos.', 'Aluno', 'Faixa', 'Média', 'Semana atual', 'Sem. 100%', 'Sequência']);

    const cells = within(bodyRows()[0]).getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells).toEqual(['1º', expect.stringContaining('Ana L.'), 'Constante', '95%', '84%', '1', '3 sem.']);

    expect(container.querySelectorAll('.consistency-medal--gold')).toHaveLength(1);
    expect(container.querySelectorAll('.consistency-medal--silver')).toHaveLength(2);
    expect(container.querySelectorAll('.consistency-medal--bronze')).toHaveLength(0);
    expect(within(bodyRows()[3]).getByText('4º')).toBeInTheDocument();
  });

  it('CAMP-52 lists entering participants last', () => {
    const entering = row({ studentId: 's9', name: 'Zeca Paz', displayName: 'Zeca P.', position: null, eligible: false, faixa: 'entering', average: 80, validWeeks: 1, entering: { validWeeks: 1, required: 2 }, weeksMissing: 1 });
    renderTab({ data: payload({ rows: [row()], entering: [entering] }) });

    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Ana L.')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Zeca P.')).toBeInTheDocument();
    expect(within(rows[1]).getAllByRole('cell')[0]).toHaveTextContent('—');
    expect(within(rows[1]).getByText('Entrando · 1 de 2 semanas')).toBeInTheDocument();
  });

  it('CAMP-53 calls onOpenStudent with the row when the student is used', async () => {
    const user = userEvent.setup();
    const { onOpenStudent } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Ana L.' }));

    expect(onOpenStudent).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1', name: 'Ana Lima' }));
  });

  it('CAMP-55 shows the frozen standings and Encerrado em', () => {
    renderTab({
      data: payload({
        status: 'completed',
        currentWeek: 4,
        closesAt: null,
        challenge: { ...payload().challenge, closedAt: '2026-11-30T00:05:00Z' },
        rows: [row({ currentWeekScore: null })],
      }),
    });

    expect(screen.getByText('Encerrado em 29/11')).toBeInTheDocument();
    expect(screen.queryByText(/Semana \d de \d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/faltam/)).not.toBeInTheDocument();
    expect(within(bodyRows()[0]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1º', expect.stringContaining('Ana L.'), 'Constante', '95%', '—', '1', '3 sem.']);
  });

  it('CAMP-56 shows Começa na segunda and the participant count', () => {
    renderTab({
      data: payload({ status: 'scheduled', currentWeek: null, closesAt: null, rows: [], entering: [], challenge: { ...payload().challenge, startDate: '2026-11-23', endDate: '2026-12-20' } }),
    });

    expect(screen.getByText('Começa na segunda, 23/11.')).toBeInTheDocument();
    expect(screen.getByText('3 participantes')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Classificação do campeonato' })).not.toBeInTheDocument();
    expect(screen.queryByText('1º')).not.toBeInTheDocument();
  });

  it('CAMP-62 shows the empty state', () => {
    renderTab({ data: payload({ rows: [], entering: [] }) });

    expect(screen.getByText('Nenhum participante com semana válida ainda.')).toBeInTheDocument();
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
