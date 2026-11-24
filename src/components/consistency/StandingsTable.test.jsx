import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import StandingsTable from './StandingsTable';

const SEASON = { number: 3, startWeek: '2026-10-19', weeks: 4, currentWeek: 3 };

const PILLARS_OK = [
  { pillar: 'workouts', done: 4, expected: 4, adherence: 100 },
  { pillar: 'cardio', done: 2, expected: 4, adherence: 50 },
];

// Standings row with the fields of the trainer API; overrides replace any of them
const buildRow = (overrides = {}) => ({
  studentId: 'student-1',
  displayName: 'Paula G.',
  initials: 'PG',
  position: 4,
  faixa: 'constant',
  average: 98.4,
  currentWeekScore: 85,
  weeks100: 1,
  streak: 1,
  seasonPillars: PILLARS_OK,
  risk: null,
  signals: [],
  pause: null,
  entering: null,
  ...overrides,
});

const ENTERING_ROW = buildRow({
  studentId: 'student-9',
  displayName: 'Isabela N.',
  initials: 'IN',
  position: null,
  faixa: 'entering',
  average: 64,
  currentWeekScore: 64,
  weeks100: 0,
  streak: 0,
  seasonPillars: [],
  entering: { validWeeks: 1, required: 2 },
});

// Renders the table with spies for every action
const renderTable = (props = {}) => {
  const handlers = { onOpenStudent: vi.fn(), onMessage: vi.fn(), onPause: vi.fn(), onClearFilters: vi.fn() };
  render(<StandingsTable rows={[buildRow()]} entering={[]} season={SEASON} {...handlers} {...props} />);
  return handlers;
};

// The table row of a student
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(name) });

describe('StandingsTable', () => {
  it('PAN-17 keeps the WhatsApp button but offers no pause on a closed season', () => {
    renderTable({ season: { ...SEASON, status: 'closed' } });
    expect(screen.getByRole('button', { name: 'Mensagem no WhatsApp para Paula G.' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pausar semana de/ })).not.toBeInTheDocument();
  });

  it('PAN-04 renders every column of a row', () => {
    renderTable();
    ['Pos.', 'Aluno', 'Faixa', 'Temporada', 'Pilares', 'Semana atual', 'Sem. 100%', 'Sequência', 'Ações'].forEach((header) => {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    });
    const row = rowOf('Paula G.');
    expect(within(row).getByText('4º')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Paula G.' })).toBeInTheDocument();
    expect(within(row).getByText('Constante')).toBeInTheDocument();
    expect(within(row).getByText('98%')).toBeInTheDocument();
    expect(within(row).getByRole('progressbar', { name: 'Constância' })).toHaveAttribute('aria-valuenow', '98');
    expect(within(row).getByText('Tre')).toBeInTheDocument();
    expect(within(row).getByText('Car')).toBeInTheDocument();
    expect(within(row).getByText('85%')).toBeInTheDocument();
    expect(within(row).getByText('1 sem.')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Mensagem no WhatsApp para Paula G.' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Pausar semana de Paula G.' })).toBeInTheDocument();
  });

  it('shows a dash for a neutral week and for no streak', () => {
    renderTable({ rows: [buildRow({ currentWeekScore: null, streak: 0 })] });
    const cells = within(rowOf('Paula G.')).getAllByRole('cell');
    expect(cells[5]).toHaveTextContent('—');
    expect(cells[7]).toHaveTextContent('—');
  });

  it('repeats the position of tied students and medals the podium', () => {
    renderTable({
      rows: [
        buildRow({ studentId: 'a', displayName: 'Ana S.', position: 1 }),
        buildRow({ studentId: 'b', displayName: 'Bruno M.', position: 2 }),
        buildRow({ studentId: 'c', displayName: 'Lucas P.', position: 2 }),
        buildRow({ studentId: 'd', displayName: 'Paula G.', position: 4 }),
      ],
    });
    expect(within(rowOf('Ana S.')).getByText('1º')).toHaveClass('consistency-medal--gold');
    expect(within(rowOf('Bruno M.')).getByText('2º')).toHaveClass('consistency-medal--silver');
    expect(within(rowOf('Lucas P.')).getByText('2º')).toHaveClass('consistency-medal--silver');
    expect(within(rowOf('Paula G.')).getByText('4º')).toBeInTheDocument();
  });

  it('shows the badges of pause, signal and risk under the name', () => {
    renderTable({
      rows: [
        buildRow({
          risk: { weeks: 2, scores: [64, 58] },
          signals: [{ type: 'quick_completion' }],
          pause: { weekStart: '2026-11-02', reason: 'viagem' },
        }),
      ],
    });
    const row = rowOf('Paula G.');
    expect(within(row).getByText('2 semanas abaixo de 70%')).toBeInTheDocument();
    expect(within(row).getByText('Conclusão rápida')).toBeInTheDocument();
    expect(within(row).getByText('Semana 3 pausada (viagem)')).toBeInTheDocument();
  });

  it('PAN-09 lists entering students last', () => {
    renderTable({ rows: [buildRow(), buildRow({ studentId: 'student-2', displayName: 'Bruno M.', position: 5 })], entering: [ENTERING_ROW] });
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(3);
    const last = bodyRows[2];
    expect(last).toHaveTextContent('Isabela N.');
    expect(within(last).getAllByRole('cell')[0]).toHaveTextContent('—');
    expect(within(last).getByText('Entrando')).toBeInTheDocument();
    expect(within(last).getByText('Sem semana fechada')).toBeInTheDocument();
    expect(within(last).getByText('Entrando na temporada · 1 de 2 semanas')).toBeInTheDocument();
  });

  it('PAN-18 shows the empty filter state', async () => {
    const user = userEvent.setup();
    const { onClearFilters } = renderTable({ rows: [], entering: [] });
    expect(screen.getByText('Nenhum aluno neste filtro.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtro e busca' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('PAN-57 scrolls horizontally inside the card', () => {
    renderTable();
    const scroller = screen.getByRole('region', { name: 'Classificação do time' });
    expect(scroller).toHaveClass('consistency-table__scroll');
    expect(scroller).toHaveAttribute('tabindex', '0');
    expect(within(scroller).getByRole('table')).toBeInTheDocument();
  });

  it('opens the student when the name is used', async () => {
    const user = userEvent.setup();
    const row = buildRow();
    const { onOpenStudent, onMessage, onPause } = renderTable({ rows: [row] });
    await user.click(screen.getByRole('button', { name: 'Paula G.' }));
    expect(onOpenStudent).toHaveBeenCalledWith(row);
    expect(onMessage).not.toHaveBeenCalled();
    expect(onPause).not.toHaveBeenCalled();
  });

  it('asks to message or pause the student from the row actions without opening the panel', async () => {
    const user = userEvent.setup();
    const row = buildRow();
    const { onOpenStudent, onMessage, onPause } = renderTable({ rows: [row] });
    await user.click(screen.getByRole('button', { name: 'Mensagem no WhatsApp para Paula G.' }));
    expect(onMessage).toHaveBeenCalledWith(row);
    await user.click(screen.getByRole('button', { name: 'Pausar semana de Paula G.' }));
    expect(onPause).toHaveBeenCalledWith(row);
    expect(onOpenStudent).not.toHaveBeenCalled();
  });

  it('CPD-72 explains the pillar abbreviations, first letter uppercase only, and the warning color in the legend', () => {
    renderTable();
    expect(screen.getByText('Tre treinos · Car cardio. Barra em alerta = abaixo de 70%.')).toBeInTheDocument();
  });
});
