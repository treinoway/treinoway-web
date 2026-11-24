import { render, screen, within } from '../../test/test-utils';
import ScoreScale from './ScoreScale';

const DS = { ScoreScale: '.score-scale' };

// Whole numbers from min to max as the text of the cells
const cellTexts = (min, max) => Array.from({ length: max - min + 1 }, (_, index) => String(min + index));

describe('ScoreScale', () => {
  it('renders one cell per value from 0 to 10 inside the scale root', () => {
    const { container } = render(<ScoreScale min={0} max={10} minLabel="Não treinei" maxLabel="Treinei tudo" />);

    const root = container.querySelector(DS.ScoreScale);
    expect(root).not.toBeNull();
    cellTexts(0, 10).forEach((value) => expect(within(root).getByText(value)).toBeInTheDocument());
  });

  it('shows the meaning of both ends', () => {
    const { container } = render(<ScoreScale min={0} max={10} minLabel="Não treinei" maxLabel="Treinei tudo" />);

    const root = container.querySelector(DS.ScoreScale);
    expect(within(root).getByText('Não treinei')).toBeInTheDocument();
    expect(within(root).getByText('Treinei tudo')).toBeInTheDocument();
  });

  it('follows the given range', () => {
    const { container } = render(<ScoreScale min={1} max={5} minLabel="Ruim" maxLabel="Ótimo" />);

    const root = container.querySelector(DS.ScoreScale);
    cellTexts(1, 5).forEach((value) => expect(within(root).getByText(value)).toBeInTheDocument());
    expect(within(root).queryByText('0')).not.toBeInTheDocument();
    expect(within(root).queryByText('6')).not.toBeInTheDocument();
  });

  it('renders the cells without end labels when none is given', () => {
    render(<ScoreScale min={0} max={10} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });
});
