import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import PreviousSeasonsList from './PreviousSeasonsList';

const SEASONS = [
  { number: 2, startWeek: '2026-09-21', endWeek: '2026-10-12', weeks: 4, participants: 17, average: 82 },
  { number: 1, startWeek: '2026-08-24', endWeek: '2026-09-14', weeks: 4, participants: 1, average: 79.4 },
  { number: 0, startWeek: '2026-07-27', endWeek: '2026-08-17', weeks: 4, participants: 3, average: null },
];

// The list item of a season
const itemOf = (number) => screen.getByRole('listitem', { name: `Temporada ${number}` });

describe('PreviousSeasonsList', () => {
  it('PAN-17 shows number, dates, participants and average of each closed season', () => {
    render(<PreviousSeasonsList seasons={SEASONS} onOpenSeason={vi.fn()} />);
    const first = within(itemOf(2));
    expect(first.getByText('Temporada 2')).toBeInTheDocument();
    expect(first.getByText('21/09 a 18/10 · 17 participantes · média 82%')).toBeInTheDocument();
    expect(within(itemOf(1)).getByText('24/08 a 20/09 · 1 participante · média 79%')).toBeInTheDocument();
  });

  it('PAN-17 shows a dash as the average of a season without eligible students', () => {
    render(<PreviousSeasonsList seasons={SEASONS} onOpenSeason={vi.fn()} />);
    expect(within(itemOf(0)).getByText('27/07 a 23/08 · 3 participantes · média —')).toBeInTheDocument();
  });

  it('PAN-17 shows an empty message when no season has ended', () => {
    render(<PreviousSeasonsList seasons={[]} onOpenSeason={vi.fn()} />);
    expect(screen.getByText('Sem temporadas encerradas ainda.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('PAN-45 opens the frozen standings of the season chosen with Ver classificação', async () => {
    const user = userEvent.setup();
    const onOpenSeason = vi.fn();
    render(<PreviousSeasonsList seasons={SEASONS} onOpenSeason={onOpenSeason} />);
    expect(screen.getAllByRole('button', { name: /Ver classificação/ })).toHaveLength(3);
    await user.click(within(itemOf(1)).getByRole('button', { name: 'Ver classificação da Temporada 1' }));
    expect(onOpenSeason).toHaveBeenCalledTimes(1);
    expect(onOpenSeason).toHaveBeenCalledWith(1);
  });
});
