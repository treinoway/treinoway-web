import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import RankingList from './RankingList';

const entries = [
  { position: 1, studentId: 's1', firstName: 'Alice', lastName: 'A', avatarUrl: null, points: 100 },
  { position: 2, studentId: 's2', firstName: 'Bob', lastName: 'B', avatarUrl: null, points: 80 },
  { position: 3, studentId: 's3', firstName: 'Carl', lastName: 'C', avatarUrl: null, points: 60 },
];

describe('RankingList', () => {
  it('shows empty state when entries is empty', () => {
    renderWithRouter(<RankingList entries={[]} />);
    expect(screen.getByText(/Nenhum aluno no ranking/i)).toBeInTheDocument();
  });

  it('renders entries with names and points', () => {
    renderWithRouter(<RankingList entries={entries} />);
    expect(screen.getByText('Alice A')).toBeInTheDocument();
    expect(screen.getByText('Bob B')).toBeInTheDocument();
    expect(screen.getByText('100 pts')).toBeInTheDocument();
  });

  it('hides other names in anonymous mode except own', () => {
    renderWithRouter(<RankingList entries={entries} anonymous ownStudentId="s1" />);
    expect(screen.getByText('Alice A')).toBeInTheDocument();
    expect(screen.getByText('Aluno #2')).toBeInTheDocument();
  });

  it('applies top-3 class to first three entries', () => {
    renderWithRouter(<RankingList entries={entries} />);
    const list = screen.getByLabelText('Ranking');
    const rows = list.querySelectorAll('.ranking-row');
    expect(rows[0]).toHaveClass('ranking-row--top3');
    expect(rows[2]).toHaveClass('ranking-row--top3');
  });

  it('highlights own row with --me class', () => {
    renderWithRouter(<RankingList entries={entries} ownStudentId="s2" />);
    const list = screen.getByLabelText('Ranking');
    const rows = list.querySelectorAll('.ranking-row');
    expect(rows[1]).toHaveClass('ranking-row--me');
  });

  it('calls onRowTap when row is clicked', async () => {
    const user = userEvent.setup();
    const handleTap = vi.fn();
    renderWithRouter(<RankingList entries={entries} onRowTap={handleTap} />);
    await user.click(screen.getByText('Alice A').closest('.ranking-row'));
    expect(handleTap).toHaveBeenCalledWith(entries[0]);
  });

  it('pins own row when position exceeds threshold', () => {
    const manyEntries = Array.from({ length: 15 }, (_, i) => ({
      position: i + 1,
      studentId: `s${i + 1}`,
      firstName: 'Student',
      lastName: `${i + 1}`,
      avatarUrl: null,
      points: 100 - i,
    }));
    renderWithRouter(<RankingList entries={manyEntries} ownStudentId="s12" />);
    expect(screen.getByLabelText('Sua posição')).toBeInTheDocument();
  });
});
