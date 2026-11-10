import { render, screen } from '../../test/test-utils';
import PositionMark from './PositionMark';

describe('PositionMark', () => {
  it('PAN-05 shows medals and shared positions', () => {
    render(
      <>
        <PositionMark position={1} />
        <PositionMark position={2} />
        <PositionMark position={2} />
        <PositionMark position={3} />
        <PositionMark position={4} />
      </>
    );
    expect(screen.getByText('1º')).toHaveClass('consistency-medal--gold');
    const silverMedals = screen.getAllByText('2º');
    expect(silverMedals).toHaveLength(2);
    silverMedals.forEach((medal) => expect(medal).toHaveClass('consistency-medal--silver'));
    expect(screen.getByText('3º')).toHaveClass('consistency-medal--bronze');
    expect(screen.getByText('4º')).not.toHaveClass('consistency-medal');
  });

  it('shows a dash for a student still entering the season', () => {
    render(<PositionMark position={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('keeps the full position for ranks beyond the podium', () => {
    render(<PositionMark position={18} />);
    expect(screen.getByText('18º')).toBeInTheDocument();
  });
});
