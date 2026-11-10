import { render, screen } from '../../test/test-utils';
import SeasonHeaderCard from './SeasonHeaderCard';

const SEASON = {
  number: 3,
  status: 'active',
  startWeek: '2026-10-19',
  endWeek: '2026-11-09',
  weeks: 4,
  currentWeek: 3,
  closesAt: '2026-11-09T00:00:00.000Z',
};
const NOW = new Date('2026-11-04T17:00:00.000Z');

// Renders the card with a fixed clock and the Brazilian time zone
const renderHeader = (season = SEASON) => render(<SeasonHeaderCard season={season} now={NOW} timeZone="America/Sao_Paulo" />);

describe('SeasonHeaderCard', () => {
  it('PAN-02 shows week progress and countdown', () => {
    renderHeader();
    expect(screen.getByRole('heading', { name: 'Temporada 3' })).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('19/10 a 15/11 · 4 semanas')).toBeInTheDocument();
    expect(screen.getByText('Semana 3 de 4')).toBeInTheDocument();
    expect(screen.getByText('Fecha domingo, 08/11, às 21h · faltam 4d 7h')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Semana 1' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Semana 2' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Semana 3' })).toHaveAttribute('aria-valuenow', '39');
    expect(screen.getByRole('progressbar', { name: 'Semana 4' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows one bar per week of the season', () => {
    renderHeader({ ...SEASON, weeks: 8, endWeek: '2026-12-07', currentWeek: 1 });
    expect(screen.getAllByRole('progressbar')).toHaveLength(8);
  });

  it('shows a closed season as ended, with every week full and no countdown', () => {
    renderHeader({ ...SEASON, status: 'closed', currentWeek: 4, closesAt: null });
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.queryByText(/faltam/)).not.toBeInTheDocument();
    screen.getAllByRole('progressbar').forEach((bar) => expect(bar).toHaveAttribute('aria-valuenow', '100'));
  });
});
