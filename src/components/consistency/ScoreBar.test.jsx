import { render, screen } from '../../test/test-utils';
import ScoreBar from './ScoreBar';

describe('ScoreBar', () => {
  it('shows the rounded percentage and fills the bar to it', () => {
    render(<ScoreBar score={85.2} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '85');
  });

  it('never shows 100% before the score is 100', () => {
    render(<ScoreBar score={99.6} />);
    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('PAN-07 uses the warning color below 70', () => {
    render(
      <>
        <ScoreBar score={61} label="Abaixo" />
        <ScoreBar score={70} label="No limite" />
        <ScoreBar score={85} label="Acima" />
      </>
    );
    expect(screen.getByRole('progressbar', { name: 'Abaixo' })).toHaveClass('score-bar__track--warning');
    expect(screen.getByRole('progressbar', { name: 'No limite' })).not.toHaveClass('score-bar__track--warning');
    expect(screen.getByRole('progressbar', { name: 'Acima' })).not.toHaveClass('score-bar__track--warning');
  });

  it('shows a dash and no bar for a neutral week', () => {
    render(<ScoreBar score={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
