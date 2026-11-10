import { render, screen, within } from '../../test/test-utils';
import HistoryGeneralTable from './HistoryGeneralTable';

// History row with the fields of the trainer history API; overrides replace any of them
const buildRow = (overrides = {}) => ({
  studentId: 'student-1',
  displayName: 'Ana Beatriz S.',
  initials: 'AS',
  validWeeks: 12,
  average: 96.4,
  weeks100: 7,
  longestStreak: 5,
  ...overrides,
});

const ROWS = [
  buildRow(),
  buildRow({ studentId: 'student-2', displayName: 'Bruno C.', initials: 'BC', validWeeks: 6, average: 88, weeks100: 2, longestStreak: 0 }),
  buildRow({ studentId: 'student-3', displayName: 'Paula G.', initials: 'PG', validWeeks: 5, average: 99.6, weeks100: 0, longestStreak: 1 }),
];

// The table row of a student
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(name) });

describe('HistoryGeneralTable', () => {
  it('PAN-16 shows the average since joining, the weeks at 100% and the longest streak of each student', () => {
    render(<HistoryGeneralTable rows={ROWS} />);
    ['Aluno', 'Média desde a entrada', 'Semanas a 100%', 'Maior sequência'].forEach((header) => {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    });
    const ana = within(rowOf('Ana Beatriz S.'));
    expect(ana.getByText('96%')).toBeInTheDocument();
    expect(ana.getByText('7')).toBeInTheDocument();
    expect(ana.getByText('5 sem.')).toBeInTheDocument();
  });

  it('PAN-16 lists the students in the order received, which is by average', () => {
    render(<HistoryGeneralTable rows={ROWS} />);
    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getByText(/ [A-Z]\.$/).textContent);
    expect(names).toEqual(['Ana Beatriz S.', 'Bruno C.', 'Paula G.']);
  });

  it('PAN-16 shows 99% for an average of 99.6 and a dash for a student with no streak', () => {
    render(<HistoryGeneralTable rows={ROWS} />);
    expect(within(rowOf('Paula G.')).getByText('99%')).toBeInTheDocument();
    expect(within(rowOf('Bruno C.')).getByText('—')).toBeInTheDocument();
  });

  it('PAN-16 explains the 4 valid weeks rule', () => {
    render(<HistoryGeneralTable rows={ROWS} />);
    expect(screen.getByText(/4 ou mais semanas válidas/)).toBeInTheDocument();
  });

  it('PAN-16 shows an empty message when no student has 4 valid weeks yet', () => {
    render(<HistoryGeneralTable rows={[]} />);
    expect(screen.getByText('Ainda não há alunos com 4 semanas válidas.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
